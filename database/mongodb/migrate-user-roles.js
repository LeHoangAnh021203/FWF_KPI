const database = db.getSiblingDB("fwf_kpi");

const userRoleUpdates = database.users.updateMany(
  { role: { $in: ["manager", "boss"] } },
  [
    {
      $set: {
        role: {
          $switch: {
            branches: [
              { case: { $eq: ["$role", "manager"] }, then: "leader" },
              { case: { $eq: ["$role", "boss"] }, then: "ceo" }
            ],
            default: "$role"
          }
        },
        updatedAt: new Date().toISOString()
      }
    }
  ]
);

print("Updated users:", userRoleUpdates.modifiedCount);
