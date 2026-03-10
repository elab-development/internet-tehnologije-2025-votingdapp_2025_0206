// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.19;

import "./group.sol";

contract GroupFactory {

    event GroupCreated(
        address groupAddress,
        address admin
    );

    function createGroup()
        external
        returns(address)
    {
        Group group =
            new Group(msg.sender);

        emit GroupCreated(
            address(group),
            msg.sender
        );

        return address(group);
    }
}