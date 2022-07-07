import { CosmosMessage } from "@subql/types-cosmos";
import base64ToString from "./base64";
import { MsgExecuteContract } from "./types/models/MsgExecuteContract";
import { MsgInstantiateContract } from "./types/models/MsgInstantiateContract";

export async function handleMessage(msg: CosmosMessage): Promise<void> {
  const typeURL = msg.msg.typeUrl;
  if (typeURL.includes(`cosmwasm`)) {
    switch (typeURL) {
      case "/cosmwasm.wasm.v1.MsgInstantiateContract":
        await saveMsgInstantiateContract(msg);
        break;
      case "/cosmwasm.wasm.v1.MsgExecuteContract":
        await saveMsgExecuteContract(msg);
        break
      default:
        logger.info(`unknown typeUrl: ${typeURL} height: ${msg.block.block.header.height}`)
        break;
    }
  }
}

async function saveMsgInstantiateContract(msg): Promise<void> {
    const id = `juno-MsgInstantiateContract-${msg.block.block.header.height}-${msg.tx.hash}-${msg.idx}`;
    const txHash = msg.tx.hash;
    const messageRecord = new MsgInstantiateContract(id);

    messageRecord.index = msg.idx;
    messageRecord.height = BigInt(msg.block.block.header.height);
    messageRecord.hash = msg.block.block.id;
    messageRecord.txHash = txHash;
    messageRecord.sender = msg.msg.decodedMsg.sender;
    messageRecord.contract = msg.msg.decodedMsg.contract;
    messageRecord.msg = decodeMessageBase64(msg.msg.decodedMsg);
    messageRecord.raw = JSON.stringify(msg.msg.decodedMsg);

    await messageRecord.save()
}

async function saveMsgExecuteContract(msg): Promise<void> {
  const id = `juno-MsgExecuteContract-${msg.block.block.header.height}-${msg.tx.hash}-${msg.idx}`;
    const txHash = msg.tx.hash;
    const messageRecord = new MsgExecuteContract(id);

    messageRecord.index = msg.idx;
    messageRecord.height = BigInt(msg.block.block.header.height);
    messageRecord.hash = msg.block.block.id;
    messageRecord.txHash = txHash;
    messageRecord.sender = msg.msg.decodedMsg.sender;
    messageRecord.contract = msg.msg.decodedMsg.contract;
    messageRecord.msg = decodeMessageBase64(msg.msg.decodedMsg);
    messageRecord.raw = JSON.stringify(msg.msg.decodedMsg);

    await messageRecord.save()
}

function decodeMessageBase64(message){
    if (Array.isArray(message)){
      for (let i=0; i<message.length; i++) {
          message[i] = decodeMessageBase64(message[i]);
      }
      return message;
    }

    for (const field in message) {
        const value = message[field];
        const type = typeof value;
        if (field == "msg" && type == "string" && value != "") {
          message[field] = JSON.parse(base64ToString(value));
        } else if (type == "object" && value !== "" && value != null) {
          if (field == "msg" ) {
            const jsonValue = JSON.stringify(value);
            let decoded;
            if (jsonValue !== "" && !jsonValue.includes(`{"0":`) ) {
              decoded = value;
            } else {
              decoded = JSON.parse(base64ToString(value))
            }
            message[field] = decodeMessageBase64(decoded);
          } else {
            message[field] = decodeMessageBase64(value);
          }
        }
    }
    return message;
}
