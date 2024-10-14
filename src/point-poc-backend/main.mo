import HashMap "mo:base/HashMap";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import HU "utils/HashUtils";

actor PointSystem {
  private var burnNonces = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
  private stable var points : [(Text, Nat)] = [];
  private var pointBalances = HashMap.HashMap<Text, Nat>(0, Text.equal, Text.hash);
  private stable var owner : Principal = Principal.fromText("pnmc4-h5fuj-6xi3a-zaw7g-5lzp3-5rxwq-5fbid-mvapc-zaow4-rsj7m-eae");

  private func isAdmin(caller : Principal) : Bool {
    Principal.equal(caller, owner)
  };

  public shared(msg) func mint(_address : Text, amount : Nat) : async Result.Result<(), Text> {
    if (not isAdmin(msg.caller)) {
      return #err(Text.concat("Unauthorized: Only admin can mint points. Caller: ", Principal.toText(msg.caller)));
    };

    let address = Text.toLowercase(_address);
    let currentBalance = pointBalances.get(address);

    switch (currentBalance) {
      case (?balance) {
        pointBalances.put(address, balance + amount);
      };
      case null {
        pointBalances.put(address, amount);
      };
    };

    #ok(())
  };

  public shared(msg) func burn(_address : Text, amount : Nat, signature : Text) : async Result.Result<(), Text> {
    if (not isAdmin(msg.caller)) {
      return #err(Text.concat("Unauthorized: Only admin can burn points. Caller: ", Principal.toText(msg.caller)));
    };

    let address = Text.toLowercase(_address);

    // nonce 체크
    let storedNonce = burnNonces.get(address);
    let nonce = switch (storedNonce) {
      case (null) { 0 };
      case (?prevNonce) { prevNonce + 1 };
    };

    // signature 체크
    let message = await makeMessage(address, amount, nonce);
    let hashedMessage = HU.hashMessage(message);
    let isValidSignature = verifySignature(address, signature, hashedMessage);
    switch (isValidSignature) {
        case (#err(e)) {
            return #err(e);
        };
        case (#ok(signatureId)) {};
    };

    let currentBalance = pointBalances.get(address);
    switch (currentBalance) {
      case (null) {
        #err("User does not have any points")
      };
      case (?balance) {
        if (balance < amount) {
          #err("Insufficient points")
        } else {
          pointBalances.put(address, balance - amount);
          burnNonces.put(address, nonce);
          #ok(())
        };
      };
    };
  };

  public query func balanceOf(_address : Text) : async Nat {
    let address = Text.toLowercase(_address);
    switch (pointBalances.get(address)) {
      case (?balance) { balance };
      case null { 0 };
    };
  };

  public query func makeMessage(_address : Text, amount : Nat, nonce : Nat) : async Text {
    let address = Text.toLowercase(_address);
    return address # "," # Nat.toText(amount) # "," # Nat.toText(nonce)
  };

  public query func getBurnNonce(_address : Text) : async Nat {
    let address = Text.toLowercase(_address);
    switch (burnNonces.get(address)) {
      case (null) { 0 };
      case (?nonce) { nonce };
    }
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

  private func verifySignature(address : Text, signature : Text, message : Text) : {#err : Text; #ok : Nat8} {
    let defaultContext = DefaultContext.Context();
    let _signature = AU.fromText(signature);
    let _address = AU.fromText(Text.toLowercase(address));
    let _message = AU.fromText(message);
    let response = Helper.getRecoveryId(_message, _signature, _address, defaultContext.ecCtx);
    
    return response;
  };

  system func preupgrade() {
    points := Iter.toArray(pointBalances.entries());
  };

  system func postupgrade() {
    pointBalances := HashMap.fromIter<Text, Nat>(points.vals(), 1, Text.equal, Text.hash);
  };
};
