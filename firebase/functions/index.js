'use strict'

const functions = require('firebase-functions');
const {dialogflow, Confirmation} = require('actions-on-google');

const app = dialogflow({
    debug: true,
    clientId : '336474509170-2d0041msj7vk6m0nbcpf3auhot3qavrm.apps.googleusercontent.com'
});

function second_person(s) {
    return s
        .replace(/( |^)I am([ .,:;/-]|$)/i,  "you are")
        .replace(/( |^)I was([ .,:;/-]|$)/i, "you were")
        .replace(/( |^)I([ .,:;/-]|$)/i,     "you")
        .replace(/( |^)me([ .,:;/-]|$)/i,    "you")
        .replace(/( |^)my([ .,:;/-]|$)/i,    "your")
        .replace(/( |^)mine([ .,:;/-]|$)/i,  "yours")
        ;
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
    var tokens = s.split(/\s+/);
    console.log(JSON.stringify(tokens));
    return tokens;
}

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
    });
    return max_evidence_id;
}

app.intent('remember', (conv) => {
    var to_remember = strip_deep_link(conv.input.raw);
    if (/remember[, ]*(?:that +)?/i.test(to_remember)) {
        var split = to_remember.split(/remember[, ]*(?:that +)?/i);;
        to_remember = split.slice(1).join(" remember ");
    }
    remember(conv, to_remember);
    conv.ask("Alright, I'll remember that " + second_person(to_remember))
});

app.intent('recall', (conv) => {
    var query  = strip_deep_link(conv.input.raw)
    if (conv.user.storage.mem) {
        var statement_id = recall(conv, query)
        console.log(statement_id);
        var s = conv.user.storage.mem.statements[statement_id];
        console.log(s);
        s = second_person(s)
        s = s.charAt(0).toUpperCase() + s.substring(1)
        conv.ask(s);
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

// app.intent('forget', (conv) => {
//     conv.ask(new Confirmation("Are you sure you want to forget everything?"))
// });

// app.intent('confirm forget', (conv, params, confirmed) => {
//     if (confirmed) {
//         conv.user.storage = {};
//         conv.ask("Alright, I've forgotten everything.");
//     } else {
//         conv.ask("Okay, don't worry, I'll keep remembering.");
//     }
// });

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
