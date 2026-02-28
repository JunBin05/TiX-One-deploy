import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  CLOCK_OBJECT_ID,
  OCT_TYPE,
  PACKAGE_ID,
  TICKET_PRICE_MIST,
} from "./config";



export function useBuyTicket() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState<string>("");
  const [buyDigest, setBuyDigest] = useState<string>("");

  const buyTicket = async () => {
    setBuyError("");
    setBuyDigest("");

    if (!currentAccount) {
      setBuyError("Connect OneWallet to continue.");
      return;
    }

    setIsBuying(true);
    try {
      const tx = new Transaction();
      tx.setSender(currentAccount.address);
      tx.setGasBudget(100_000_000);

      const [tempCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(TICKET_PRICE_MIST)]);

      tx.moveCall({
        target: `${PACKAGE_ID}::ticket::buy_ticket_oct`,
        arguments: [tempCoin, tx.object(CLOCK_OBJECT_ID)],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });

      const receipt = await suiClient.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true },
      });

      if (receipt.effects?.status?.status === "success") {
        setBuyDigest(result.digest);
      } else {
        setBuyError(
          `On-chain error: ${receipt.effects?.status?.error || "unknown"}`
        );
      }
    } catch (e: any) {
      setBuyError(e?.message || "Transaction failed");
    } finally {
      setIsBuying(false);
    }
  };

  const buyTicketAtPrice = async (
    priceMist: bigint,
    concertObjectId: string,
    seat = "General Admission"
  ) => {
    setBuyError("");
    setBuyDigest("");

    if (!currentAccount) {
      setBuyError("Connect OneWallet to continue.");
      return null;
    }
    if (priceMist <= 0n) {
      setBuyError("Ticket price must be greater than 0.");
      return null;
    }
    if (!concertObjectId) {
      setBuyError("Concert not linked to blockchain yet. Please try again shortly.");
      return null;
    }

    setIsBuying(true);
    try {
      const tx = new Transaction();
      tx.setSender(currentAccount.address);
      tx.setGasBudget(100_000_000);

      const [tempCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)]);

      tx.moveCall({
        target: `${PACKAGE_ID}::ticket::buy_ticket_oct_at_price`,
        arguments: [
          tx.object(concertObjectId),  // &mut Concert — enforces supply cap
          tempCoin,
          tx.pure.string(seat),
          tx.pure.u64(priceMist),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });

      const receipt = await suiClient.waitForTransaction({
        digest: result.digest,
        options: { showEffects: true },
      });

      if (receipt.effects?.status?.status === "success") {
        setBuyDigest(result.digest);
        return result.digest;
      }

      setBuyError(`On-chain error: ${receipt.effects?.status?.error || "unknown"}`);
      return null;
    } catch (e: any) {
      setBuyError(e?.message || "Transaction failed");
      return null;
    } finally {
      setIsBuying(false);
    }
  };

  return {
    buyTicket,
    buyTicketAtPrice,
    isBuying,
    buyError,
    buyDigest,
    isConnected: !!currentAccount,
    address: currentAccount?.address,
  };
}
