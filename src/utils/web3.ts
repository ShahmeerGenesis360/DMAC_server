import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as borsh from "borsh";

import {
  PublicKey,
  Keypair,
  Connection,
  AddressLookupTableAccount,
  TransactionInstruction,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from "@solana/spl-token";

import fetch from "node-fetch";
import { schema, SharedAccountsRouteArgs } from "./schema";

const jupiterProgramId = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
);
const PYTH_NETWORK_PROGRAM_ID = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);

// Excluded pubkeys
const excludedPubkeys = new Set([
  "H8W3ctz92svYg6mkn1UtGfu2aQr2fnUFHM1RhScEtQDt",
  "JUPDWNB9G9Hsg8PKynnP6DyWLsXVn4QnqMCqg6n4ZdM",
  "8BR3zs8zSXetpnDjCtHWnkpSkNSydWb3PTTDuVKku2uu",
  "2wT8Yq49kHgDzXuPxZSaeLaH1qbmGXtEyPy64bL7aD3c",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "JUPLdTqUdKztWJ1isGMV92W2QvmEmzs9WTJjhZe4QdJ",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  "swapNyd8XiQwJ6ianp9snpu4brUqFxadzvHebnAXjJZ",
  "vo1tWgqZMjG61Z2T9qUaMYKqZ75CYzMuaZ2LZP1n7HV",
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C",
  "rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ",
  "SoLFiHG9TfgtdUXUjWAxi3LtvYuFyDLVhBWxdMZxyCe",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
  "HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt",
  // "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE",
]);

const removePubkeys = new Set([
  "Sysvar1nstructions1111111111111111111111111",
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "So11111111111111111111111111111111111111112",
  "11111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
]);

export const findProgramAuthority = (programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    programId
  )[0];
};

export const findProgramWSOLAccount = (programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync([Buffer.from("wsol")], programId)[0];
};

export const findAssociatedTokenAddress = ({
  walletAddress,
  tokenMintAddress,
}: {
  walletAddress: PublicKey;
  tokenMintAddress: PublicKey;
}): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const getAdressLookupTableAccounts = async (
  connection: Connection,
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};

export const instructionDataToTransactionInstruction = (
  instructionPayload: any
) => {

  return new TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instructionPayload.data, "base64"),
  });
};

const API_ENDPOINT = "https://quote-api.jup.ag/v6";

export const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  return fetch(
    `${API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&slippage=5&onlyDirectRoutes=true`
  ).then((response) => response.json());
};

export const getSwapIx = async (
  user: PublicKey,
  outputAccount: PublicKey,
  quote: any
) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
    destinationTokenAccount: outputAccount.toBase58(),
    useSharedAccounts: true,
  };
  return fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((response) => response.json());
};

// export const swapToSolana = async (
//   program: Program,
//   provider: anchor.Provider,
//   adminKeypair: Keypair,
//   programState: PublicKey,
//   indexMint: PublicKey,
//   indexInfo: PublicKey,
//   swapToSolInfo: PublicKey,
//   userPublicKey: PublicKey,
//   computeBudgetPayloads: any[],
//   swapPayload: any,
//   addressLookupTableAddresses: string[]
// ) => {
//   try{
//     let swapInstruction = instructionDataToTransactionInstruction(swapPayload);
//     const programAuthority = findProgramAuthority(program.programId);
//     const programWSOLAccount = findProgramWSOLAccount(program.programId);
//     const adminPublicKey = adminKeypair.publicKey;
//     const connection = provider.connection;
  
//     const serializedData = Buffer.from(swapInstruction.data);
//     try {
//       const deserializedData = borsh.deserialize(schema, SharedAccountsRouteArgs, serializedData);
//       console.log("Deserialized Data:", deserializedData);
//     } catch (error) {
//       console.error("Failed to deserialize data:", error);
//     }
  
//     const instructions = [
//       ...computeBudgetPayloads.map(instructionDataToTransactionInstruction),
//       await program.methods
//         .swapToSol(swapInstruction.data)
//         .accounts({
//           programAuthority: programAuthority,
//           programWsolAccount: programWSOLAccount,
//           userAccount: adminPublicKey,
//           solMint: NATIVE_MINT,
//           jupiterProgram: jupiterProgramId,
//           tokenProgram: TOKEN_PROGRAM_ID,
//           systemProgram: SystemProgram.programId,
  
//           programState: programState,
//           indexMint: indexMint,
//           indexInfo: indexInfo,
//           swapToSolInfo: swapToSolInfo,
//           user: userPublicKey,
//           priceUpdate: PYTH_NETWORK_PROGRAM_ID,
//         })
//         .remainingAccounts(swapInstruction.keys)
//         .instruction(),
//     ];
  
//     const blockhash = (await connection.getLatestBlockhash()).blockhash;
  
//     // If you want, you can add more lookup table accounts here
//     // console.log("addressLookupTableAddresses", addressLookupTableAddresses)
//     const addressLookupTableAccounts = await getAdressLookupTableAccounts(
//       connection,
//       addressLookupTableAddresses
//     );
//     const messageV0 = new TransactionMessage({
//       payerKey: adminPublicKey,
//       recentBlockhash: blockhash,
//       instructions,
//     }).compileToV0Message(addressLookupTableAccounts);
//     const transaction = new VersionedTransaction(messageV0);
//     return transaction;
//   }
//   catch(error){
//     console.log("Error: web3.ts, SwapToSolana()",error)
//     throw error
//   }
// };

// export const swapToToken = async (
//   program: Program,
//   provider: anchor.Provider,
//   adminKeypair: Keypair,
//   programState: PublicKey,
//   indexMint: PublicKey,
//   indexInfo: PublicKey,
//   swapToTknInfo: PublicKey,
//   computeBudgetPayloads: any[],
//   swapPayload: any,
//   addressLookupTableAddresses: string[],
//   keypair: Keypair
// ) => {
//   try{
//   let swapInstruction = instructionDataToTransactionInstruction(swapPayload);
//   const programAuthority = findProgramAuthority(program.programId);
//   const programWSOLAccount = findProgramWSOLAccount(program.programId);
//   const adminPublicKey = adminKeypair.publicKey;
//   const connection = provider.connection;

//   const instructions = [
//     ...computeBudgetPayloads.map(instructionDataToTransactionInstruction),
//     await program.methods
//       .swapToTkn(swapInstruction.data)
//       .accounts({
//         programAuthority: programAuthority,
//         programWsolAccount: programWSOLAccount,
//         userAccount: adminPublicKey,
//         solMint: NATIVE_MINT,
//         jupiterProgram: jupiterProgramId,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         systemProgram: SystemProgram.programId,

//         programState: programState,
//         indexMint: indexMint,
//         indexInfo: indexInfo,
//         swapToTkn: swapToTknInfo,
//       })
//       .remainingAccounts(swapInstruction.keys)
//       .instruction(),
//   ];

//   console.log(instructions, "swap to token instruction")
//   const blockhash = (await connection.getLatestBlockhash()).blockhash;

//   // If you want, you can add more lookup table accounts 
//   const addressLookupTableAccounts = await getAdressLookupTableAccounts(
//     connection,
//     addressLookupTableAddresses
//   );
//   const messageV0 = new TransactionMessage({
//     payerKey: adminPublicKey,
//     recentBlockhash: blockhash,
//     instructions,
//   }).compileToV0Message(addressLookupTableAccounts);
//   const transaction1 = new VersionedTransaction(messageV0);
//   transaction1.sign([keypair])
//     // const txID = await provider.sendAndConfirm(transaction, [adminKeypair]);
//     return {transaction1, instructions}
//   } catch (e) {
//     console.log("Error: web3.ts, swapToToken()", e);
//     throw new Error("Failure during simulation");
//   }
// };

export const swapToSolana = async (
  program: Program,
  provider: anchor.Provider,
  adminKeypair: Keypair,
  programState: PublicKey,
  indexMint: PublicKey,
  indexInfo: PublicKey,
  swapToSolInfo: PublicKey,
  userPublicKey: PublicKey,
  computeBudgetPayloads: any[],
  swapPayload: any,
  addressLookupTableAddresses: string[] // Include ALT addresses as a parameter
): Promise<{ instructions: TransactionInstruction[]; addressLookupTableAccounts: AddressLookupTableAccount[] }> => {
  try {
    const connection = provider.connection;
    const programAuthority = findProgramAuthority(program.programId);
    const programWSOLAccount = findProgramWSOLAccount(program.programId);

    // Convert swapPayload to a TransactionInstruction
    const swapInstruction = instructionDataToTransactionInstruction(swapPayload);

    // Serialize and optionally log the data
    const serializedData = Buffer.from(swapInstruction.data);

    // Fetch Address Lookup Table Accounts
    const addressLookupTableAccounts = await getAdressLookupTableAccounts(
      connection,
      addressLookupTableAddresses
    );

    // Generate the instructions
    const computeBudgetInstructions = computeBudgetPayloads.map(
      instructionDataToTransactionInstruction
    );

    const swapToSolInstruction = await program.methods
      .swapToSol(swapInstruction.data)
      .accounts({
        programAuthority: programAuthority,
        programWsolAccount: programWSOLAccount,
        userAccount: adminKeypair.publicKey,
        solMint: NATIVE_MINT,
        jupiterProgram: jupiterProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        programState: programState,
        indexMint: indexMint,
        indexInfo: indexInfo,
        swapToSolInfo: swapToSolInfo,
        user: userPublicKey,
        priceUpdate: PYTH_NETWORK_PROGRAM_ID,
      })
      .remainingAccounts(swapInstruction.keys)
      .instruction();

    // Combine compute budget and swap instructions into a single array
    const instructions = [...computeBudgetInstructions, swapToSolInstruction];

    return { instructions, addressLookupTableAccounts };
  } catch (error) {
    console.error("Error: web3.ts, SwapToSolana()", error);
    throw error;
  }
};

export const swapToToken = async (
  program: Program,
  provider: anchor.Provider,
  adminKeypair: Keypair,
  programState: PublicKey,
  indexMint: PublicKey,
  indexInfo: PublicKey,
  swapToTknInfo: PublicKey,
  computeBudgetPayloads: any[],
  swapPayload: any,
  addressLookupTableAddresses: string[]
): Promise<{ instructions: TransactionInstruction[] }> => {
  try {
    const swapInstruction =
      instructionDataToTransactionInstruction(swapPayload);
    const programAuthority = findProgramAuthority(program.programId);
    const programWSOLAccount = findProgramWSOLAccount(program.programId);
    const adminPublicKey = adminKeypair.publicKey;
    const connection = provider.connection;

    // Create compute budget instructions
    const computeBudgetInstructions = computeBudgetPayloads.map(
      instructionDataToTransactionInstruction
    );

    // Generate swapToTkn instructions
    const swapToTknInstruction = await program.methods
      .swapToTkn(swapInstruction.data)
      .accounts({
        programAuthority: programAuthority,
        programWsolAccount: programWSOLAccount,
        userAccount: adminPublicKey,
        solMint: NATIVE_MINT,
        jupiterProgram: jupiterProgramId,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        programState: programState,
        indexMint: indexMint,
        indexInfo: indexInfo,
        swapToTkn: swapToTknInfo,
      })
      .remainingAccounts(swapInstruction.keys)
      .instruction();

    // Combine all instructions into one array
    const instructions = [...computeBudgetInstructions, swapToTknInstruction];

    return { instructions }; // Return the instructions
  } catch (error) {
    console.error("Error in swapToToken:", error);
    throw new Error("Failure during swapToToken processing");
  }
};

export async function setResult(result: string, filePath: string) {
  console.log("Setting...");
  const jsonString = JSON.stringify(result, null, 2);
  await fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        console.error(`File not found: ${filePath}`);
      } else {
        console.error(`Error deleting file: ${err.message}`);
      }
    } else {
      console.log(`File deleted successfully: ${filePath}`);
    }
  });
  // Write the JSON string to the file
  await fs.writeFile(filePath, jsonString, (err) => {
    if (err) {
      console.error("Error writing to file:", err);
    } else {
      console.log("JSON written to file successfully:", filePath);
    }
  });
}

export async function getResult(filePath: string): Promise<any> {
  console.log("Getting...");
  try {
    const data = await fsp.readFile(filePath, "utf-8"); // Specify encoding
    // console.log("File content:", data);
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

export async function processJsonFile(filePath: string) {
  const jsonData = await getResult(filePath);

  const uniquePubkeys = new Set<string>();

  // Extract pubkeys
  extractUniquePubkeys(jsonData, uniquePubkeys);

  // Generate the command
  const commandParts = [
    "solana-test-validator --url mainnet-beta --reset --compute-unit-limit 1000000",
    ...Array.from(excludedPubkeys).map(
      (pubkey) => `--clone-upgradeable-program ${pubkey}`
    ),
    ...Array.from(uniquePubkeys).map((pubkey) => `--clone ${pubkey}`),
  ];

  const command = commandParts.join(" ");
  console.log("Generated Command:");
  console.log(command);

  const command_txt = "command.txt";
  await fs.writeFile(command_txt, command, (err) => {
    if (err) {
      console.error("Error writing command to file:", err);
    } else {
      console.log("Command written to file successfully:", command_txt);
    }
  });
}

function extractUniquePubkeys(obj: any, collected: Set<string>): void {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractUniquePubkeys(item, collected);
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (key === "pubkey" && typeof obj[key] === "string") {
        const pubkey = obj[key];
        // Exclude pubkeys from both the excluded and remove lists
        if (!excludedPubkeys.has(pubkey) && !removePubkeys.has(pubkey)) {
          // if (checkAccountExists(pubkey)) {
          collected.add(pubkey);
          // }
        }
      } else {
        extractUniquePubkeys(obj[key], collected);
      }
    }
    collected.add("36ruqG5gYCyszymi4VaU6GmQzjJXGQoXXiVUnRXwFdoF");
    collected.add("2qGQquD84ULfhpwTifkCmY7M48YAJZsg5Hp1w4WADdgF");
    collected.add("DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8");
    collected.add("D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2");
    collected.add("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE");
    collected.add("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    // collected.add("FwUb69kSxdF4xzHuD6Q6S193T3LSY9dzq4y5XQo3jqBd");
    // collected.add("5EZKmFpo7vDxcjruzyM3q5PrQHaqx2VnSM9QasZUpVta");
  }
}
