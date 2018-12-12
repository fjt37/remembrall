'use strict'

const functions = require('firebase-functions');
const {dialogflow, Confirmation} = require('actions-on-google');
const natural = require('natural');

//// Helpers ////

const tokenizer = new natural.WordTokenizer() // removes all punctuation

const replacements = [
    ['I am', 'you are'], 
    ['I was', 'you were'], 
    ['I', 'you'], 
    ['me', 'you'], 
    ['my', 'your'], 
    ['mine', 'yours']
];


function second_person(s) {
    replacements.forEach(function(pair) {
        var pattern = RegExp('( |^)(' + pair[0] + ')([ .,\':;/-]|$)', 'i');
        s = s.replace(pattern, function(match, g1, g2, g3) {
            return match.replace(g2, pair[1]);
        });
    });
    return s;
}

function strip_deep_link(input) {
    var i = input.search(/my little grey cells /i);
    if (i > -1) {
        input = input.substring(i + 21);
        if (input.toLowerCase().startsWith("that ")) {
            input = input.substring(5);
        }
    }
    return input;
}

function tokenize(s) {
    var tokens = tokenizer.tokenize(s);
    console.log(JSON.stringify(tokens));
    return tokens;
}

//// Primary Logic ////

function remember(conv, s) {
    console.log("REMEMBERING");
    if (!conv.user.storage.hasOwnProperty('mem')) {
        conv.user.storage.mem = {
            statements: [],
            indices: {},
        }
    }
    console.log(JSON.stringify(conv.user.storage));
    var i = conv.user.storage.mem.statements.length;
    conv.user.storage.mem.statements.push(s);
    tokenize(s).forEach(function(token) {
        if (typeof(conv.user.storage.mem.indices[token]) != "object") {
            conv.user.storage.mem.indices[token] = new Array();
        }
        conv.user.storage.mem.indices[token].push(i);
    });
    console.log(JSON.stringify(conv.user.storage));
}

function recall(conv, s) {
    console.log("RECALLING");
    var evidence = new Array();
    conv.user.storage.mem.statements.forEach(function(statement) {
        evidence.push(0);
    })
    console.log(JSON.stringify(evidence));
    tokenize(s).forEach(function(token) {
        if (conv.user.storage.mem.indices.hasOwnProperty(token)) {
            conv.user.storage.mem.indices[token].forEach(function(statement_id) {
                evidence[statement_id] += 1;
            });
        }
    });
    console.log("Evidence: " + JSON.stringify(evidence));
    var max_evidence_id = 0
    evidence.forEach(function(e, id, evidence) {
        if (e > evidence[max_evidence_id]) {
            max_evidence_id = id;
        }
        else if (e == evidence[max_evidence_id] && conv.user.storage.mem.statements[id].length < conv.user.storage.mem.statements[max_evidence_id].length) {
            max_evidence_id = id;
        }
    });
    if (evidence[max_evidence_id] < 1) {
        max_evidence_id = -1;
    }
    return max_evidence_id;
}

//// Dialogflow ////

const app = dialogflow({
    debug: true,
    clientId : '336474509170-2d0041msj7vk6m0nbcpf3auhot3qavrm.apps.googleusercontent.com'
});

app.intent('remember', (conv) => {
    var to_remember = strip_deep_link(conv.input.raw);
    if (/remember[, ]*(?:that +)?/i.test(to_remember)) {
        var split = to_remember.split(/remember[, ]*(?:that *)?/i);;
        to_remember = split.slice(1).join(" remember ");
    }
    if (to_remember.length > 0) {
        remember(conv, to_remember);
        conv.ask("Alright, I'll remember that " + second_person(to_remember));
    } else {
        conv.ask("What would you like me to remember?");
    }
});

app.intent('recall', (conv) => {
    var query  = strip_deep_link(conv.input.raw)
    if (conv.user.storage.mem) {
        var statement_id = recall(conv, query)
        console.log(statement_id);
        if (statement_id >= 0) {
            var s = conv.user.storage.mem.statements[statement_id];
            console.log(s);
            s = second_person(s)
            s = s.charAt(0).toUpperCase() + s.substring(1)
            conv.ask(s);
        } else {
            conv.ask("I don't seem to have any relevant memories.")
        }
    }
    else {
        conv.ask("I'm sorry, nothing has been remembered.");
        conv.ask("Try saying \"Remember that ...\"");
    }
});

app.intent('clear all memories', (conv) => {
    conv.user.storage = {};
    conv.ask("Okay, all memories have been forgotten.")
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
