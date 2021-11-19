const fs = require("fs");
const { consoleTerminal, runCommand } = require("tondev");
const path = require("path");
const { Account } = require("@tonclient/appkit");
const { TonClient, signerKeys, BocModule } = require("@tonclient/core");
const { libNode } = require("@tonclient/lib-node");
TonClient.useBinaryLibrary(libNode);

(async () => {
    const client = new TonClient({
        network: {
            endpoints: ["http://localhost"]
        }
    });
    try {
        await compile(client, code);
    } catch (err) {
        console.error(err);
    }
    client.close();
})();

async function compile(client, code) {
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };

    let contractName = code.substring(code.indexOf("contract ") + 9, code.indexOf("{"))
        .split(" ")[0].capitalize();
    let contractNameSol = contractName + ".sol";

    await fs.writeFileSync(contractNameSol, code);
    await runCommand(consoleTerminal, "sol compile", {
        file: path.resolve(__dirname, contractNameSol)
    });

    await deploy(client, contractName);
}

async function deploy(client, contractName) {
    const keys  = {
        public: "af0115f94c93848ac16afb811e3bb992116b0b85f9a2ac618adae56b5f4e2039",
        secret: "c0152d49dee1e48791f1e4c749abdd1be0026cd2042db21f8ca65d8e905cc87d"
    }
    
    const abi = await JSON.parse(fs.readFileSync(contractName + ".abi.json"));
    const tvc = fs.readFileSync(contractName + ".tvc", {encoding: 'base64'});

    const ContractAcc = new Account({
        abi: abi,
        tvc: tvc
    }, {
        signer: signerKeys(keys),
        client: client
    });

    const address = await ContractAcc.getAddress();
    console.log(`Future address of the contract will be: ${address}`);

    await ContractAcc.deploy({ useGiver: true });
    console.log(contractName + ` contract was deployed at address: ${address}`);

    await getDAbi(contractName);
    await getDecodeTVC(client, contractName);
}

async function getDAbi(contractName) {
    await fs.writeFileSync(contractName + ".json", "{ \n " +
        "   \"dabi\": \"" + fs.readFileSync(contractName + ".abi.json", "hex") + "\" " +
        "\n }");
}

async function getDecodeTVC(client, contractName) {
    const tvc = fs.readFileSync(contractName + ".tvc", {encoding: 'base64'});
    const boc = new BocModule(client);
    await boc.decode_tvc({tvc: tvc});
}