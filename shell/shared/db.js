// Sandstorm - Personal Cloud Sandbox
// Copyright (c) 2014, Kenton Varda <temporal@gmail.com>
// All rights reserved.
//
// This file is part of the Sandstorm platform implementation.
//
// Sandstorm is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// Sandstorm is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public
// License along with Sandstorm.  If not, see
// <http://www.gnu.org/licenses/>.

// This file defines the database schema.

Packages = new Meteor.Collection("packages");
// Packages which are installed or downloadloading.
//
// Each contains:
//   _id:  128-bit prefix of SHA-256 hash of spk file, hex-encoded.
//   status:  String.  One of "download", "verify", "unpack", "analyze", "ready", "failed"
//   progress:  Float.  -1 = N/A, 0-1 = fractional progress (e.g. download percentage),
//       >1 = download byte count.
//   error:  If status is "failed", error message string.
//   manifest:  If status is "ready", the package manifest.  See "Manifest" in grain.capnp.
//   appId:  If status is "ready", the application ID string.  Packages representing different
//       versions of the same app have the same appId.  The spk tool defines the app ID format
//       and can cryptographically verify that a package belongs to a particular app ID.

UserActions = new Meteor.Collection("userActions");
// List of actions that each user has installed which create new grains.  Each app may install
// some number of actions (usually, one).
//
// Each contains:
//   _id:  random
//   userId:  User who has installed this action.
//   packageId:  Package used to run this action.
//   appId:  Same as Packages.findOne(packageId).appId; denormalized for searchability.
//   appVersion:  Same as Packages.findOne(packageId).manifest.appVersion; denormalized for
//       searchability.
//   title:  Human-readable title for this action, e.g. "New Spreadsheet".
//   command:  Manifest.Command to run this action (see package.capnp).

Grains = new Meteor.Collection("grains");
// Grains belonging to users.
//
// Each contains:
//   _id:  random
//   packageId:  _id of the package of which this grain is an instance.
//   appId:  Same as Packages.findOne(packageId).appId; denormalized for searchability.
//   appVersion:  Same as Packages.findOne(packageId).manifest.appVersion; denormalized for
//       searchability.
//   userId:  User who owns this grain.
//   title:  Human-readable string title, as chosen by the user.

Sessions = new Meteor.Collection("sessions");
// UI sessions open to particular grains.  A new session is created each time a user opens a grain.
//
// Each contains:
//   _id:  random
//   grainId:  _id of the grain to which this session is connected.
//   port:  TCP port number on which this session is being exported.
//   timestamp:  Time of last keep-alive message to this session.  Sessions time out after some
//       period.

SignupKeys = new Meteor.Collection("signupKeys");
// Invite keys which may be used by users to get access to Sandstorm.
//
// Each contains:
//   _id:  random
//   used:  Boolean indicating whether this key has already been consumed.
//   note:  Text note assigned when creating key, to keep track of e.g. whom the key was for.

if (Meteor.isServer) {
  Meteor.publish("credentials", function () {
    // Data needed for isSignedUp() and isAdmin() to work.

    if (this.userId) {
      return Meteor.users.find({_id: this.userId}, {fields: {signupKey: 1, isAdmin: 1}});
    } else {
      return [];
    }
  });

  // The first user to sign in should be automatically upgraded to admin.
  Accounts.onCreateUser(function (options, user) {
    if (Meteor.users.find().count() === 0) {
      user.isAdmin = true;
      user.signupKey = "admin";
    }

    if (options.profile) {
      user.profile = options.profile;
    }

    return user;
  });
}

isSignedUp = function() {
  // Returns true if the user has presented an invite key.

  var user = Meteor.user();
  if (user && user.signupKey) {
    return true;
  } else {
    return false;
  }
}

isAdmin = function() {
  // Returns true if the user is the administrator.

  var user = Meteor.user();
  if (user && user.isAdmin) {
    return true;
  } else {
    return false;
  }
}
