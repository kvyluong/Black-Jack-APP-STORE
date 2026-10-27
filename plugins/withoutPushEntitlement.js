// Removes the push notification entitlement that expo-notifications adds. ShoeSharp only
// schedules local reminders (no remote push), which need no entitlement, and the App Store
// provisioning profile doesn't include the Push Notifications capability. List it before
// "expo-notifications" in app.json: entitlement mods run in reverse order, so it then runs after.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
