package com.example.webchatserver;

import jakarta.websocket.*;
import jakarta.websocket.server.PathParam;
import jakarta.websocket.server.ServerEndpoint;
import org.json.JSONObject;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@ServerEndpoint("/ws/{roomID}")
public class ChatServer {
    private Map<String, String> usernames = new HashMap<>();
    private static Map<String, String> roomList = new HashMap<>();

    @OnOpen
    public void open(@PathParam("roomID") String roomID, Session session) throws IOException {
        roomList.put(session.getId(), roomID);
        session.getBasicRemote().sendText("{\"type\": \"chat\", \"message\":\"(Server " + roomID + "): Welcome to the chat room. Your are currently in room " + roomID + ". Please state your username to begin.\"}");
    }

    @OnClose
    public void close(Session session) throws IOException {
        String userId = session.getId();
        if (usernames.containsKey(userId)) {
            String username = usernames.get(userId);
            usernames.remove(userId);
            String roomID = roomList.get(userId);   
            roomList.remove(roomID);

            for (Session peer : session.getOpenSessions()) {
                peer.getBasicRemote().sendText("{\"type\": \"chat\", \"message\":\"(Server): " + username + " left the chat room.\"}");
            }
        }   
    }

    @OnMessage
    public void handleMessage(String comm, Session session) throws IOException {
        String userID = session.getId();
        String roomID = roomList.get(userID);
        JSONObject jsonmsg = new JSONObject(comm);
        String username = usernames.get(userID);
        String message = jsonmsg.optString("msg", "");

        // Log received message details
        System.out.println("Received message from user " + userID + " in room " + roomID + ": " + message);

        // if the user is already in the chat room
        if (usernames.containsKey(userID)) {
            System.out.println(username);
            for (Session peer : session.getOpenSessions()) {
                if (roomList.get(peer.getId()).equals(roomID)) { // Check if the user is in the same room
                    if (!message.isEmpty()) { // Check if message is not empty
                        peer.getBasicRemote().sendText("{\"type\": \"chat\", \"message\":\"(" + username + "): " + message + "\"}");
                    }
                }
            }
        } else { // new users
            usernames.put(userID, message);
            session.getBasicRemote().sendText("{\"type\": \"chat\", \"message\":\"(Server): Welcome, " + message + "!\"}");

            // Broadcast message to inform other users about the new joiner
            for (Session peer : session.getOpenSessions()) {
                if (!peer.getId().equals(userID) && roomList.get(peer.getId()).equals(roomID)) {
                    peer.getBasicRemote().sendText("{\"type\": \"chat\", \"message\":\"(Server): " + message + " joined the chat room.\"}");
                }
            }
        }
    }
}
