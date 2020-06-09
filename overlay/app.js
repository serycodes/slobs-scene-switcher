function main(){
    // first, check for url var options
    var optionsQSP = getUrlVars()['options'];
    if(optionsQSP == undefined){
        $("h1#error").text("No options specified.")
    }
    else{
        // Make sure options are valid base64.
        try{
            optionsQSP=atob(decodeURI(optionsQSP))
        }
        catch(error) {
            $("h1#error").text("Could not decode options. :(")
            throw error;
        }
        // Make sure options are valid JSON.
        try{
            optionsQSP=JSON.parse(optionsQSP)
        }
        catch(error){
            $("h1#error").text("Options JSON is invalid. :(")
            throw error;
        }
        
        var sock = new SockJS('http://localhost:59650/api')

        var twitchClient = new tmi.Client({
            options: { debug: false },
            connection: {
                reconnect: true,
                secure: true
            },
            channels: [optionsQSP.tu]
        });

        twitchClient.on("connected", (address, port) => {
            console.log('Connection opened to Twitch.');
        });

        twitchClient.on("disconnected", (address, port) => {
            console.log('Disconnected from Twitch.');
        });

        twitchClient.on("join", (channel, username, self) => {
            console.log(`Joined Twitch channel ${channel}.`)
        });

        twitchClient.on('message', (channel, user, message) => {
            var findCommandMatch = optionsQSP.c.filter((command)=>command.cn === message)[0];
            if(findCommandMatch){
                if(isBroadcaster(user) || (isMod(user) && findCommandMatch.m === true)){
                    console.log(`${user['display-name']} executing command: ${findCommandMatch.cn}`);
                    sendSLOBSMessage(sock, "changeScene", "makeSceneActive", "ScenesService", [findCommandMatch.s])
                }
            }
        });

        sock.onopen = function() {
            console.log('SockJS connection opened to SLOBS');
            sendSLOBSMessage(sock, "auth", "auth", "TcpServerService", [optionsQSP.at])
            try{
                twitchClient.connect();
            }
            catch(error){
                $("h1#error").text("Unable to connect to Twitch.")
                throw error;
            }
        };

        sock.onmessage = function(e) {
            sockSLOBS = JSON.parse(e.data);
            console.log('Message from SLOBS', sockSLOBS);
        };

        sock.onerror = function(e) {
            console.error(e);
        }

        sock.onclose = function() {
            console.log('SockJS connection closed to SLOBS');
            $("h1#error").text("Disconnected from SLOBS.")
            twitchClient.disconnect();
        };
    }

}



function sendSLOBSMessage (sock, id, method, resource, args=[]) {
    obj = {
        jsonrpc: "2.0",
        id: id,
        method: method,
        params: {
            resource: resource,
            args: args
        }
    };
    sock.send(JSON.stringify(obj));
}

function isBroadcaster(user) {
    if ((user['badges'] != null && 'broadcaster' in user['badges'])){
        return true;
    }
    return false;
};

function isMod(user) {
    if ((user['badges'] != null && 'moderator' in user['badges']) || isBroadcaster(user)){
        return true;
    }
    return false;
};

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

// Let's get started
$(document).ready(function(){main()});