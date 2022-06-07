let ERC20 = artifacts.require("./ERC20.sol");
let { catchRevert } = require("./exceptionsHelper.js")

contract("ERC20", function (accounts) {
    const [_owner, alice, bob] = accounts

    let instance;

    describe("MyERC20Contract", () => {
        beforeEach(async () => {
            instance = await ERC20.new('SMX Token', 'SMX');
        })

        describe("when Alice has 10 tokens", () => {
            beforeEach(async () => {
                await instance.transfer(alice, 10, {from: _owner});
            })

            describe("when Alice transfers 10 tokens", () => {
                it("should transfer token correctly", async () => {
                    await instance.transfer(bob, 10, {from: alice});

                    const result = await instance.balanceOf(bob);

                    assert.equal(
                        result,
                        10,
                        "there is some issue"
                    )
                })
            })

            describe("when Alice transfers 15 tokens", () => {
                it("should revert the transaction", async () => {
                    await catchRevert(instance.transfer(bob, 15, {from: alice}));
                })
            })
        })
    })
})