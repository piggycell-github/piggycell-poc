import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";

actor PointSystem {
  private stable var points : [(Text, Nat)] = [];
  private var pointBalances = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
  private stable var owner : Principal = Principal.fromText("pnmc4-h5fuj-6xi3a-zaw7g-5lzp3-5rxwq-5fbid-mvapc-zaow4-rsj7m-eae");

  private func isAdmin(caller : Principal) : Bool {
    Principal.equal(caller, owner)
  };

  public shared(msg) func mint(userId : Text, amount : Nat) : async Result.Result<(), Text> {
    if (not isAdmin(msg.caller)) {
      return #err(Text.concat("Unauthorized: Only admin can mint points. Caller: ", Principal.toText(msg.caller)));
    };

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
    if (not isAdmin(msg.caller)) {
      return #err(Text.concat("Unauthorized: Only admin can burn points. Caller: ", Principal.toText(msg.caller)));
    };

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
    };
  };

  public query func balanceOf(userId : Text) : async Nat {
    switch (pointBalances.get(userId)) {
      case (?balance) { balance };
      case null { 0 };
    };
  };

  public shared(msg) func setOwner(newOwner : Principal) : async Result.Result<(), Text> {
    if (not isAdmin(msg.caller)) {
      return #err("Unauthorized: Only current owner can set a new owner");
    };
    owner := newOwner;
    #ok(())
  };

  public query func getOwner() : async Principal {
    owner
  };

  system func preupgrade() {
    points := Iter.toArray(pointBalances.entries());
  };

  system func postupgrade() {
    pointBalances := HashMap.fromIter<Text, Nat>(points.vals(), 1, Text.equal, Text.hash);
  };
};
