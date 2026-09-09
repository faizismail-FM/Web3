// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ProofChainRegistry
 * @notice Anchors proofs that a document existed at a point in time.
 *
 * @dev The document itself is never sent to or stored by this contract. Only a
 * SHA-256 fingerprint, a public verification id, the issuer and a timestamp are
 * recorded. Anyone can recompute the fingerprint of a file they hold and compare
 * it against what is stored here.
 *
 * Duplicate policy — the spec's "unless explicitly designed otherwise":
 * uniqueness is enforced per (document, issuer) rather than globally per
 * document. Two counterparties to the same shipment legitimately hold the same
 * bill of lading, and both must be able to attest to it. Preventing that would
 * make the first registrant the only party who could ever prove they had the
 * document. What is prevented is the same issuer registering the same document
 * twice, which is the meaningful duplicate.
 *
 * Verification ids are globally unique, since they are the public handle a
 * counterparty is given.
 */
contract ProofChainRegistry is Ownable, Pausable {
    struct DocumentProof {
        bytes32 documentHash;
        address issuer;
        uint256 timestamp;
        string verificationId;
    }

    /// @dev Keyed by keccak256(verificationId), which is globally unique.
    mapping(bytes32 => DocumentProof) private _proofsByIdKey;

    /// @dev Prevents one issuer registering the same document twice.
    mapping(bytes32 => mapping(address => bool)) private _registeredByIssuer;

    /// @dev First proof recorded for a document, so a hash-only lookup can answer.
    mapping(bytes32 => bytes32) private _firstIdKeyByHash;

    uint256 private _totalProofs;

    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed issuer,
        string verificationId,
        uint256 timestamp
    );

    error InvalidDocumentHash();
    error InvalidVerificationId();
    error DocumentAlreadyRegisteredByIssuer(bytes32 documentHash, address issuer);
    error VerificationIdAlreadyUsed(string verificationId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Records a proof for a document fingerprint.
     * @param documentHash SHA-256 fingerprint of the document, as bytes32.
     * @param verificationId Public, human-readable handle such as "PC-8F29A2".
     *
     * @dev The caller is the issuer. There is no way to register on someone
     * else's behalf, so an issuer address in a proof always attested to it.
     */
    function registerDocument(bytes32 documentHash, string calldata verificationId)
        external
        whenNotPaused
    {
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();

        bytes memory idBytes = bytes(verificationId);
        // Bounded so a caller cannot inflate storage cost with an arbitrarily
        // long id, and because every id this system issues is far shorter.
        if (idBytes.length == 0 || idBytes.length > 32) {
            revert InvalidVerificationId();
        }

        if (_registeredByIssuer[documentHash][msg.sender]) {
            revert DocumentAlreadyRegisteredByIssuer(documentHash, msg.sender);
        }

        bytes32 idKey = keccak256(idBytes);
        if (_proofsByIdKey[idKey].timestamp != 0) {
            revert VerificationIdAlreadyUsed(verificationId);
        }

        _proofsByIdKey[idKey] = DocumentProof({
            documentHash: documentHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            verificationId: verificationId
        });
        _registeredByIssuer[documentHash][msg.sender] = true;

        if (_firstIdKeyByHash[documentHash] == bytes32(0)) {
            _firstIdKeyByHash[documentHash] = idKey;
        }

        // Cannot overflow: one increment per transaction.
        unchecked {
            _totalProofs += 1;
        }

        emit DocumentRegistered(
            documentHash,
            msg.sender,
            verificationId,
            block.timestamp
        );
    }

    /**
     * @notice Looks up the earliest proof recorded for a document fingerprint.
     * @return registered Whether any proof exists for this fingerprint.
     */
    function verifyDocument(bytes32 documentHash)
        external
        view
        returns (
            bool registered,
            address issuer,
            uint256 timestamp,
            string memory verificationId
        )
    {
        DocumentProof storage proof = _proofsByIdKey[_firstIdKeyByHash[documentHash]];
        if (proof.timestamp == 0) {
            return (false, address(0), 0, "");
        }
        return (true, proof.issuer, proof.timestamp, proof.verificationId);
    }

    /// @notice Looks up a proof by its public verification id.
    function getProof(string calldata verificationId)
        external
        view
        returns (
            bool registered,
            bytes32 documentHash,
            address issuer,
            uint256 timestamp
        )
    {
        DocumentProof storage proof = _proofsByIdKey[keccak256(bytes(verificationId))];
        if (proof.timestamp == 0) {
            return (false, bytes32(0), address(0), 0);
        }
        return (true, proof.documentHash, proof.issuer, proof.timestamp);
    }

    /// @notice Whether a specific issuer has already registered a document.
    function isRegisteredByIssuer(bytes32 documentHash, address issuer)
        external
        view
        returns (bool)
    {
        return _registeredByIssuer[documentHash][issuer];
    }

    function totalProofs() external view returns (uint256) {
        return _totalProofs;
    }

    /**
     * @notice Halts new registrations.
     * @dev Existing proofs remain readable and verifiable. Pausing is an
     * incident control for the write path only — it can never invalidate a
     * proof that was already recorded.
     */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
