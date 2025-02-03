import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodePacked,
  keccak256,
  parseAbiItem,
  type AbiEvent,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import ollama from "ollama";
import "dotenv/config";

if (!process.env.OPERATOR_PRIVATE_KEY) {
  throw new Error("OPERATOR_PRIVATE_KEY not found in environment variables");
}

type Task = {
  contents: string;
  taskCreatedBlock: number;
};

const abi = parseAbi([
  "function respondToTask((string contents, uint32 taskCreatedBlock) task, uint32 referenceTaskIndex, string risk, bytes memory signature) external",
  "event NewTaskCreated(uint32 indexed taskIndex, (string contents, uint32 taskCreatedBlock) task)",
]);

async function createSignature(
  account: any,
  risk: string,
  contents: string
) {
  const messageHash = keccak256(
    encodePacked(["string", "string"], [risk, contents])
  );

  const signature = await account.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

async function respondToTask(
  walletClient: any,
  publicClient: any,
  contractAddress: string,
  account: any,
  task: Task,
  taskIndex: number
) {
  try {
    console.log("Responding to task:")
    const response = await ollama.chat({
      model: "deepseek-r1:1.5b",
      messages: [{ role: "user", content: task.contents }],
      temperature: 0.5,
    });

    let risk = "None";
    if (response.message.content.includes("low risk")) {
      risk = "Low Risk Approved Coy💦";
    } else if (response.message.content.includes("medium risk")) {
      risk = "Medium Risk Approved Coy💦";
    } else if (response.message.content.includes("high risk")) {
      risk = "High Risk Approved Coy💦";
    } else {
      risk = "Not in risk";
    }

    const signature = await createSignature(account, risk, task.contents);

    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi,
      functionName: "respondToTask",
      args: [task, taskIndex, risk, signature],
      account: account.address,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Responded to task:", {
      taskIndex,
      task,
      risk,
      transactionHash: hash,
    });
  } catch (error) {
    console.error("Error responding to task:", error);
  }
}

async function main() {
  const contractAddress = "0xf4fa0d1C10c47cDe9F65D56c3eC977CbEb13449A";

  const account = privateKeyToAccount(
    process.env.OPERATOR_PRIVATE_KEY as `0x${string}`
  );

  const publicClient = createPublicClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
  });

  const walletClient = createWalletClient({
    chain: anvil,
    transport: http("http://localhost:8545"),
    account,
  });

  console.log("Starting to watch for new tasks...");
  publicClient.watchEvent({
    address: contractAddress,
    event: parseAbiItem(
      "event NewTaskCreated(uint32 indexed taskIndex, (string contents, uint32 taskCreatedBlock) task)"
    ) as AbiEvent,
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log;
        if (!args) continue;

        const taskIndex = Number((args as any).taskIndex);

        const task = (args as { task: Task }).task;

        console.log("New task detected:", {
          taskIndex,
          task,
        });

        await respondToTask(
          walletClient,
          publicClient,
          contractAddress,
          account,
          task,
          taskIndex
        );
      }
    },
  });

  process.on("SIGINT", () => {
    console.log("Stopping task watcher...");
    process.exit();
  });

  await new Promise(() => {});
}

main().catch(console.error);