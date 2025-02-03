import { createPublicClient, createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import "dotenv/config";

if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY not found in environment variables");
}

type Task = {
  contents: string;
  taskCreatedBlock: number;
};

const abi = parseAbi([
  "function createNewTask(string memory contents) external returns ((string contents, uint32 taskCreatedBlock))",
]);

async function main() {
  const contractAddress = "0xf4fa0d1C10c47cDe9F65D56c3eC977CbEb13449A";

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

  const publicClient = createPublicClient({
    chain: anvil,
    transport: http("http://127.0.0.1:8545"),
  });

  const walletClient = createWalletClient({
    chain: anvil,
    transport: http("http://127.0.0.1:8545"),
    account,
  });

  try {
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi,
      functionName: "createNewTask",
      args: [
        "I calssified in low risk or medium risk or high risk, where : " +
        "I have some experience with DeFi but havent done much staking. " +
        "I usually stake for mid-term periods, around 1 to 6 months. " +
        "I prefer the highest rewards, even if they are volatile. " +
        "I use a mix of well-known and new staking platforms. " +
        "I avoid unaudited smart contracts but sometimes take risks if the APY is high. " +
        "If the market fluctuates, I hold my stake but monitor closely. " +
        "I have a basic understanding of impermanent loss and slashing risks"
      ],
      account: account.address,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction hash:", hash);
    console.log("Transaction receipt:", receipt);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);