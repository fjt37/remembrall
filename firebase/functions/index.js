'use strict'

const functions = require('firebase-functions');
const {dialogflow, Confirmation} = require('actions-on-google');

const app = dialogflow({
    debug: true,
    clientId : '336474509170-2d0041msj7vk6m0nbcpf3auhot3qavrm.apps.googleusercontent.com'
});

function second_person(s) {
    return s
        .replace("I am", "you are")
        .replace("i am", "you are")
        .replace("I was", "you were")
        .replace("i was", "you were")
        .replace("I", "you")
        .replace("i", "you")
        .replace("me", "you")
        .replace("Me", "You")
        .replace("my", "your")
        .replace("My", "Your")
        .replace("mine", "yours")
        .replace("Mine", "Yours");
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

function remember(s) {
    if (!conv.user.storage.hasOwnProperty('mem')) {
        conv.user.storage.mem = {
            statements: [],
            indices: {},
        }
    }
    var i = conv.user.storage.mem.statements.length;
    s.split().forEach(function(token) {
        if (typeof(conv.user.storage.mem.indices[token]) != "object") {
            conv.user.storage.indices[token] = new Array();
        }
        conv.user.storage.indices[token].push(i);
    });
}

function recall(s) {
    var evidence = new Array();
    conv.user.storage.indices.forEach(function(token) {
        evidence.push(0);
    })
    s.split().forEach(function(token) {
        conv.user.storage.indices[token].forEach(function(statement_id) {
            evidence[statement_id] += 1;
        });
    });
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
        var split = text.split(/remember[, ]*(?:that +)?/i);;
        to_remember = split.slice(1).join(" remember ");
    }
    remember(to_remember);
    conv.ask("Alright, I'll remember that " + second_person(to_remember))
});

app.intent('recall', (conv) => {
    var query  = strip_deep_link(conv.input.raw)
    if (conv.user.storage.mem) {
        var s = conv.user.storage.mem.statements[recall(query)];
        s = second_person(s)
        s = s.charAt(0).toUpperCase() + s.substring(1)
        conv.ask(s);
    }
    else {
        conv.ask("I'm sorry, nothing has been remembered.");
        conv.ask("Try saying \"Rember that ...\"");
    }
});

app.intent('forget', (conv) => {
    conv.ask(new Confirmation("Are you sure you want to forget everything?"))
});

app.intent('confirm forget', (conv, params, confirmed) => {
    if (confirmed) {
        conv.user.storage = {};
        conv.ask("Alright, I've forgotten everything.");
    } else {
        conv.ask("Okay, don't worry, I'll keep remembering.");
    }
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
