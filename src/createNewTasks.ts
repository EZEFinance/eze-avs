import { ethers } from "ethers";
import * as dotenv from "dotenv";
const fs = require('fs');
const path = require('path');
dotenv.config();

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
/// TODO: Hack
let chainId = 84532;

const avsDeploymentData = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../contracts/deployments/eze-finance/${chainId}.json`), 'utf8'));
const ezeFinanceServiceManagerAddress = avsDeploymentData.addresses.ezeFinanceServiceManager;
const ezeFinanceServiceManagerABI = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../abis/EzeFinanceServiceManager.json'), 'utf8'));
// Initialize contract objects from ABIs
const ezeFinanceServiceManager = new ethers.Contract(ezeFinanceServiceManagerAddress, ezeFinanceServiceManagerABI, wallet);


async function createNewTask(taskName: string) {
  try {
    // Send a transaction to the createNewTask function
    const tx = await ezeFinanceServiceManager.taskAgent(taskName);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    console.log(`Transaction successful with hash: ${receipt.hash}`);

    
  } catch (error) {
    console.error('Error sending transaction:', error);
  }
}

// Function to create a new task with a random name every 15 seconds
function startCreatingTasks() {
    const idProtocol = 'Uniswap_UNI';
    console.log(`Creating new task with idProtocol: ${idProtocol}`);
    createNewTask(idProtocol);
}

// Start the process
startCreatingTasks();