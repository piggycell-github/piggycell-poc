import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
actor PointSystem {
  private stable var points : [(Text, Nat)] = [];
  private var pointBalances = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);

  public shared(msg) func mint(userId : Text, amount : Nat) : async Result.Result<(), Text> {
    let currentBalance = pointBalances.get(userId);

    switch (currentBalance) {
      case (?balance) {
        pointBalances.put(userId, balance + amount);
      };
      case null {
        pointBalances.put(userId, amount);
      };
    };

    #ok(())
  };

  public shared(msg) func burn(userId : Text, amount : Nat) : async Result.Result<(), Text> {
    let currentBalance = pointBalances.get(userId);
        switch (currentBalance) {
            case (null) {
                #err("User does not have any points")
            };
            case (?balance) {
                if (balance < amount) {
                    #err("Insufficient points")
                } else {
                    pointBalances.put(userId, balance - amount);
                    #ok(())
                };
            };
        }
  };

  public query func balanceOf(userId : Text) : async Nat {
    switch (pointBalances.get(userId)) {
      case (?balance) { balance };
      case null { 0 };
    };
  };

  system func preupgrade() {
    points := Iter.toArray(pointBalances.entries());
  };

  system func postupgrade() {
    pointBalances := HashMap.fromIter<Text, Nat>(points.vals(), 1, Text.equal, Text.hash);
  };
};
