/*
Copyright 2014 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

/*
This service serves as the entry point for all models in the app. If access to
underlying data in a room is required, then this service should be used as the
dependency.
*/
// NB: This is more explicit than linking top-level models to $rootScope
//     in that by adding this service as a dep you are clearly saying "this X
//     needs access to the underlying data store", rather than polluting the
//     $rootScope.
angular.module('modelService', [])
.factory('modelService', ['matrixService', function(matrixService) {
    
    /***** Room Object *****/
    var Room = function Room(room_id) {
        this.room_id = room_id;
        this.old_room_state = new RoomState();
        this.current_room_state = new RoomState();
        this.events = []; // events which can be displayed on the UI. TODO move?
    };
    Room.prototype = {
        addMessageEvents: function addMessageEvents(events, toFront) {
            for (var i=0; i<events.length; i++) {
                this.addMessageEvent(events[i], toFront);
            }
        },
        
        addMessageEvent: function addMessageEvent(event, toFront) {
            // every message must reference the RoomMember which made it *at
            // that time* so things like display names display correctly.
            if (toFront) {
                event.room_member = this.old_room_state.getStateEvent("m.room.member", event.user_id);
                this.events.unshift(event);
            }
            else {
                event.room_member = this.current_room_state.getStateEvent("m.room.member", event.user_id);
                this.events.push(event);
            }
        },
        
        addOrReplaceMessageEvent: function addOrReplaceMessageEvent(event, toFront) {
            // Start looking from the tail since the first goal of this function 
            // is to find a message among the latest ones
            for (var i = this.events.length - 1; i >= 0; i--) {
                var storedEvent = this.events[i];
                if (storedEvent.event_id === event.event_id) {
                    // It's clobbering time!
                    this.events[i] = event;
                    return;
                }
            }
            this.addMessageEvent(event, toFront);
        },
        
        leave: function leave() {
            return matrixService.leave(this.room_id);
        }
    };
    
    /***** Room State Object *****/
    var RoomState = function RoomState() {
        // list of RoomMember
        this.members = {}; 
        // state events, the key is a compound of event type + state_key
        this.state_events = {}; 
        this.pagination_token = ""; 
    };
    RoomState.prototype = {
        // get a state event for this room from this.state_events. State events
        // are unique per type+state_key tuple, with a lot of events using 0-len
        // state keys. To make it not Really Annoying to access, this method is
        // provided which can just be given the type and it will return the 
        // 0-len event by default.
        state: function state(type, state_key) {
            if (!type) {
                return undefined; // event type MUST be specified
            }
            if (!state_key) {
                return this.state_events[type]; // treat as 0-len state key
            }
            return this.state_events[type + state_key];
        },
        
        storeStateEvent: function storeState(event) {
            this.state_events[event.type + event.state_key] = event;
        },
        
        storeStateEvents: function storeState(events) {
            for (var i=0; i<events.length; i++) {
                this.storeStateEvent(events[i]);
            }
        },
        
        getStateEvent: function getStateEvent(event_type, state_key) {
            return this.state_events[event_type + state_key];
        }
    };
    
    /***** Room Member Object *****/
    var RoomMember = function RoomMember() {
        this.event = {}; // the m.room.member event representing the RoomMember.
        this.user = undefined; // the User
    };
    
    /***** User Object *****/
    var User = function User() {
        this.event = {}; // the m.presence event representing the User.
    };
    
    // rooms are stored here when they come in.
    var rooms = {
        // roomid: <Room>
    };
    
    console.log("Models inited.");
    
    return {
    
        getRoom: function(roomId) {
            if(!rooms[roomId]) {
                rooms[roomId] = new Room(roomId);
            }
            return rooms[roomId];
        }
    
    };
}]);
