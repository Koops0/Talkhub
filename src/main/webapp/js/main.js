let wsMap = {}; // map of room codes to websockets, useful for rooms
let currentRoom = ""; // current room code being displayed

function timestamp() {
    var d = new Date(),
        minutes = d.getMinutes();
    if (minutes < 10) minutes = '0' + minutes;
    return d.getHours() + ':' + minutes;
}

window.onload = function () {
    // Create a 5 digit room code
    let defaultRoomCode = "ABC42";
    document.getElementById("roomCodes").innerHTML += "<li><button class='button' onclick='enterRoom(\"" + defaultRoomCode + "\")' data-code='" + defaultRoomCode + "'>" + defaultRoomCode + "</button></li>";
    enterRoom(defaultRoomCode);
    currentRoom = defaultRoomCode;
}

function newRoom() {
    // calling the ChatServlet to retrieve a new room ID
    let callURL = "http://localhost:8080/WSChatServer-1.0-SNAPSHOT/chat-servlet";

    fetch(callURL, {
        method: 'GET',
        headers: {
            'Accept': 'text/plain',
        },
    })
        .then(response => response.text())
        .then(roomCode => {
            // Sanitize the room code for use in the selector
            let sanitizedCode = roomCode.replace(/[^a-zA-Z0-9-_]/g, '');
            if (sanitizedCode !== roomCode) {
                roomCode = sanitizedCode;
            }

            // Leave the current room
            if (currentRoom !== "") {
                leaveRoom(currentRoom);
            }

            // Add the new room code to the UI
            let roomCodesElement = document.getElementById("roomCodes");
            if (roomCodesElement) {
                roomCodesElement.innerHTML += "<li><button class='button' onclick='enterRoom(\"" + roomCode + "\")' data-code='" + roomCode + "'>" + roomCode + "</button></li>";
                enterRoom(roomCode);
            } else {
                console.error("Room codes element not found in the DOM.");
            }
        })
        .catch(error => {
            console.error('Error fetching new room:', error);
        }
    );
}

function newRoomManual() { // Create a new room with a user-provided code
    // retrieve code from html
    let roomCode = document.getElementById("code").value;

    // Sanitize the room code for use in the selector
    let sanitizedCode = roomCode.replace(/[^a-zA-Z0-9-_]/g, '');
    if (sanitizedCode !== roomCode) {
        roomCode = sanitizedCode;
    }

    // Leave the current room
    if (currentRoom !== "") {
        leaveRoom(currentRoom);
    }

    // Add the new room code to the UI
    let roomCodesElement = document.getElementById("roomCodes");
    if (roomCodesElement) {
        roomCodesElement.innerHTML += "<li><button class='button' onclick='enterRoom(\"" + roomCode + "\")' data-code='" + roomCode + "'>" + roomCode + "</button></li>";
        enterRoom(roomCode);
    } else {
        console.error("Room codes element not found in the DOM.");
    }
}

function enterRoom(code) {
    // Clear existing messages
    document.getElementById("log").value = "";

    // Remove the 'selected' class from all room buttons
    let roomButtons = document.querySelectorAll("#roomCodes button");
    roomButtons.forEach(button => {
        button.classList.remove("selected");
    });

    // Add the 'selected' class to the clicked room button if it exists
    let selectedButton = document.querySelector("#roomCodes button[data-code='" + code + "']");
    if (selectedButton) {
        selectedButton.classList.add("selected");
    } else {
        console.error("Button for room code not found:", code);
        return;
    }

    // Create or reuse the WebSocket connection for the given room code
    if (!wsMap[code]) {
        // Create new WebSocket if not already created
        wsMap[code] = new WebSocket("ws://localhost:8080/WSChatServer-1.0-SNAPSHOT/ws/" + code);

        // Parse messages received from the server and update the UI accordingly
        wsMap[code].onmessage = function (event) {
            console.log(event.data);
            let message = JSON.parse(event.data);
            document.getElementById("log").value += "[" + timestamp() + "] " + message.message + "\n";
        }
    }

    // Update the current room code being displayed
    document.getElementById("currentRoom").innerText = code;
    currentRoom = code;
}

// Send a message to the server
function sendMessage() {
    let messageInput = document.getElementById("input");
    let message = messageInput.value.trim();
    if (message !== "") {
        let request = {
            "type": "chat",
            "msg": message
        };
        let currCode = document.getElementById("currentRoom").innerText;
        if (wsMap[currCode]) { // Check if WebSocket exists for the current room code
            wsMap[currCode].send(JSON.stringify(request));
        } else {
            console.error("WebSocket not found for room code:", currCode);
        }
        messageInput.value = ""; // Clear the input field after sending the message
    }
}

//leave the room
function leaveRoom(code) {
    if (wsMap[code]) {
        wsMap[code].close();
        delete wsMap[code];
    }
}

// DOM Room Click Listener
document.getElementById("roomCodes").addEventListener("click", function (event) {
    if (event.target.tagName === "BUTTON") {
        let roomCode = event.target.getAttribute("data-code");
        enterRoom(roomCode); // Switch to the clicked room
    }
});


// DOM Message Listeners
document.getElementById("input").addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

// Add click event listener to the send message button
document.getElementById("sendMessageButton").addEventListener("click", function () {
    sendMessage();
});

// VIDEO CALLING
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM fully loaded and parsed");

    const APP_ID = "e7fa4f9cf0074bc78b5c416ce71b13a5";
    const TOKEN = "007eJxTYJD8fK9tX7zFIsMFeuaXp/FdN7+2+JDrgxTBZYdc66VddlkpMKSapyWapFkmpxkYmJskJZtbJJkmmxiaJaeaGyYZGiearmISS2sIZGTQ23CclZEBAkF8doaCnKry/KJsBgYAsFIgcA==";
    const CHANNEL_NAME = "plzwork";

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    console.log("AgoraRTC client created successfully");

    let localTracks = [];
    let remoteUsers = {};

    let joinAndDisplayLocalStream = async () => {
        client.on('user-published', handleUserJoined);
        client.on('user-left', handleUserLeft);

        let UID = await client.join(APP_ID, CHANNEL_NAME, TOKEN, null);

        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

        let player = `<div class="video-container" id="user-container-${UID}">
                            <div class="video-player" id="user-${UID}"></div>
                      </div>`;
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        localTracks[1].play(`user-${UID}`);

        await client.publish([localTracks[0], localTracks[1]]);
    };

    let joinStream = async () => {
        await joinAndDisplayLocalStream();
        document.getElementById('join-btn').style.display = 'none';
        document.getElementById('stream-controls').style.display = 'flex';
    };

    let handleUserJoined = async (user, mediaType) => {
        remoteUsers[user.uid] = user;
        await client.subscribe(user, mediaType);

        if (mediaType === 'video') {
            let player = document.getElementById(`user-container-${user.uid}`);
            if (player != null) {
                player.remove();
            }

            player = `<div class="video-container" id="user-container-${user.uid}">
                            <div class="video-player" id="user-${user.uid}"></div> 
                     </div>`;
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

            user.videoTrack.play(`user-${user.uid}`);
        }

        if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    };

    let handleUserLeft = async (user) => {
        delete remoteUsers[user.uid];
        document.getElementById(`user-container-${user.uid}`).remove();
    };

    let leaveAndRemoveLocalStream = async () => {
        for (let i = 0; localTracks.length > i; i++) {
            localTracks[i].stop();
            localTracks[i].close();
        }

        await client.leave();
        document.getElementById('join-btn').style.display = 'block';
        document.getElementById('stream-controls').style.display = 'none';
        document.getElementById('video-streams').innerHTML = '';
    };

    let toggleMic = async (e) => {
        if (localTracks[0].muted) {
            await localTracks[0].setMuted(false);
            e.target.innerText = 'Mic on';
            e.target.style.backgroundColor = 'cadetblue';
        } else {
            await localTracks[0].setMuted(true);
            e.target.innerText = 'Mic off';
            e.target.style.backgroundColor = '#EE4B2B';
        }
    };

    let toggleCamera = async (e) => {
        if (localTracks[1].muted) {
            await localTracks[1].setMuted(false);
            e.target.innerText = 'Camera on';
            e.target.style.backgroundColor = 'cadetblue';
        } else {
            await localTracks[1].setMuted(true);
            e.target.innerText = 'Camera off';
            e.target.style.backgroundColor = '#EE4B2B';
        }
    };

    document.getElementById('join-btn').addEventListener('click', joinStream);
    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);

    console.log("Event listeners added successfully");
});