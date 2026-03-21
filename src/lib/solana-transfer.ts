const RPC_URL = "https://api.mainnet-beta.solana.com";
const MEEET_MINT_STR = "EJgyptJK58M9AmJi1w8ivGBjeTm5JoTqFefoQ6JTpump";
const TREASURY_STR = "4zkqErmzJhFQ7ahgTKfqTHutPk5GczMMXyAaEgbEpN1e";

async function signAndSend(walletProvider: any, tx: any): Promise<string> {
  const { Connection } = await import("@solana/web3.js");
  const connection = new Connection(RPC_URL, "confirmed");
  tx.feePayer = walletProvider.publicKey;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;

  if (walletProvider.signAndSendTransaction) {
    const { signature } = await walletProvider.signAndSendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  }

  if (walletProvider.signTransaction) {
    const signed = await walletProvider.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
    return signature;
  }

  throw new Error("Wallet does not support transaction signing");
}

/**
 * Send SOL to treasury wallet. Returns tx signature.
 */
export async function sendSolToTreasury(
  walletProvider: any,
  amountSol: number,
): Promise<string> {
  if (!walletProvider?.publicKey) throw new Error("Wallet not connected");

  const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: walletProvider.publicKey,
      toPubkey: new PublicKey(TREASURY_STR),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }),
  );

  return signAndSend(walletProvider, tx);
}

/**
 * Send $MEEET SPL tokens to treasury. Returns tx signature.
 */
export async function sendMeeetToTreasury(
  walletProvider: any,
  amountRaw: number,
): Promise<string> {
  if (!walletProvider?.publicKey) throw new Error("Wallet not connected");

  const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
  const {
    getAssociatedTokenAddress,
    createTransferInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
  } = await import("@solana/spl-token");

  const connection = new Connection(RPC_URL, "confirmed");
  const sender = walletProvider.publicKey;
  const MEEET_MINT = new PublicKey(MEEET_MINT_STR);
  const TREASURY = new PublicKey(TREASURY_STR);

  const senderAta = await getAssociatedTokenAddress(MEEET_MINT, sender);
  const treasuryAta = await getAssociatedTokenAddress(MEEET_MINT, TREASURY);

  const tx = new Transaction();

  try {
    await getAccount(connection, treasuryAta);
  } catch {
    tx.add(createAssociatedTokenAccountInstruction(sender, treasuryAta, TREASURY, MEEET_MINT));
  }

  tx.add(createTransferInstruction(senderAta, treasuryAta, sender, amountRaw));

  return signAndSend(walletProvider, tx);
}
