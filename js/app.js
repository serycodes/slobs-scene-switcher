var scenes, apiToken;

// First, check Slobs status, runs on page load
var checkSlobsStatus = function () {
    $.ajax({
        url: 'http://127.0.0.1:59650/api/info',
        timeout: 1000
    })
    .done((data) => {
        $(".streamlabs-offline").hide();
        $(".streamlabs-online").show();
    })
    .fail((error) => {
        // we go agane
        setTimeout(checkSlobsStatus,5000);
    });
}

// API Token, makes sure person fills out API token field
$('input#api_token').keyup(function(e) {
    var input = $(this);

    if(( input.val() == "" || input.val() == null)) {
        $("#slobsConnectedButton").attr("disabled","true");
    }
    else{
        $("#slobsConnectedButton").removeAttr("disabled");
    }

    // might as well handle an enter keypress
    if(e.which == 13) { 
        slobsConnected();
        return false;
    }
});

// Twitch username check, makes sure person fills out Twitch username field
$('#twitch_username').keyup(function(e) {
    var input = $(this);

    if(( input.val() == "" || input.val() == null)) {
        $("#twitchConnectedButton").attr("disabled","true");
    }
    else{
        $("#twitchConnectedButton").removeAttr("disabled");
    }

    // might as well handle an enter keypress
    if(e.which == 13) { 
        twitchConnected();
        return false;
    }
});

//Watch for command deletes
$("#command-group-container").on("click",".remove_command", function(e){ 
    e.preventDefault();
    $(this).parents('div.command-group').remove();
});

//watch for command adds
$("#command-group-container").on("click",".add_command", function(e){ 
    e.preventDefault();
    createSceneCommand();
});

var getSceneSelectObject = function() {
    var sceneSelect = $("<select></select>", {name: "scene"})
    scenes.forEach((scene)=>{
        var option = $("<option></option>", {value: scene.id, text: scene.name});
        sceneSelect.append(option);
    })
    return sceneSelect;
}

// Prepopulate commmands for scenes
var createCommandsForScenes = function() {
    // Build command objects
    scenes.forEach((scene)=>{
        var commandName = `!${scene.name.toLowerCase().trim().replace(/(W+|\s+)/g, "")}`;
        var sceneId = scene.id;
        createSceneCommand(commandName, sceneId);
    })
}

var createSceneCommand = function (commandName=null, sceneId=null) {
    var sceneObj = getSceneSelectObject();
    var html = `<div class="command-group" ${sceneId ? `data-scene="${sceneId}"` : ""}>
        <label>Command:
            <input name="command" ${commandName ? `value="${commandName}"` : ""}></input>
        </label>
        <label>Scene:
            ${sceneObj[0].outerHTML}
        </label>
        <label>
            <input type="checkbox" name="mods" checked>
            Allow Mods to Use
        </label>
        <button class="small remove_command">Remove</button>
    </div>`

    // Append command 
    $("#command-group-add").before(html);

    // If has sceneId, select that scene
    if(sceneId){
        $(".command-group[data-scene="+sceneId+"]").find("option[value="+sceneId+"]").prop("selected",true);
    }
}

var createOverlayUrl = function () {
    var options = {
        tu: $("#twitch_username").val(),
        at: apiToken,
        c: []
    }
    var rowCount = $("div.command-group").length;
    for(i=0; i < rowCount; i++){
        var group = $("div.command-group")[i];
        var item = {};
        item.cn = $(group).find("input[name=command]").val();
        item.s = $(group).find("select[name=scene]").val();
        item.m = $(group).find("input[name=mods]").is(":checked");
        options.c.push(item);
    }
    $("#overlay-url").text(`https://sery.codes/slobs-scene-switcher/overlay/?options=${encodeURI(btoa(JSON.stringify(options)))}`);
}


// Next button on slobs connected page
var slobsConnected = function () {
    getScenes();
}

// Next button on twitch connect page
var twitchConnected = function () {
    createCommandsForScenes();
    $("#second").hide();
    $("#third").show();
}

// Done button on commands page
var doneWithCommands = function () {
    createOverlayUrl();
    $("#third").hide();
    $("#fourth").show();
}

// Handle SockJS Connection/Scenes
var getScenes = function () {
    apiToken = $("input#api_token").val();
    var sock = new SockJS('http://127.0.0.1:59650/api');
    
    sock.onopen = function() {
        console.log('SockJS connection open to SLOBS');
        sendSLOBSMessage("auth", "auth", "TcpServerService", [apiToken])
    };

    sock.onmessage = function(e) {
        sockSLOBS = JSON.parse(e.data);
        console.log('message', sockSLOBS);
        if(sockSLOBS.id === "getInitialScenes"){
            scenes = sockSLOBS.result;
            sock.close();
            $("#first").hide();
            $("#second").show();
        }
        if(sockSLOBS.id === "auth"){
            if(sockSLOBS.error){
                $("#slobs_auth_error").show()
            }
            else{
                sendSLOBSMessage("getInitialScenes", "getScenes", "ScenesService")
            }
            
        }
    };

    sock.onclose = function() {
        console.log('SockJS connection closed to SLOBS');
    };

    function sendSLOBSMessage (id, method, resource, args=[]) {
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
}

// Let's get started
$(document).ready(function(){checkSlobsStatus()});