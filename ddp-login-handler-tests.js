// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by ddp-login-handler.js.
import { name as packageName } from "meteor/leaonline:ddp-login-handler";

// Write your tests here!
// Here is an example.
Tinytest.add('ddp-login-handler - example', function (test) {
  test.equal(packageName, "ddp-login-handler");
});
