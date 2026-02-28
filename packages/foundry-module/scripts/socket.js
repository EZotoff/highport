import { handleNodeUpdate } from "./receive.js";

export class FoundryBridge {
  constructor(serverUrl, apiKey) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect() {
    const url = `${this.serverUrl}/foundry`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Highport Bridge: Connected");
      this.reconnectAttempts = 0;
      this.send({ 
        type: "handshake", 
        apiKey: this.apiKey,
        clientType: "foundry",
        version: "1.0.0"
      });
    };

    this.ws.onclose = () => {
      console.log("Highport Bridge: Disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("Highport Bridge: WebSocket error", error);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error("Highport Bridge: Failed to parse message", e);
      }
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Highport Bridge: Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(this.reconnectDelay * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`Highport Bridge: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  async handleMessage(msg) {
    console.log("Highport Bridge: Received message", msg.type);

    switch (msg.type) {
      case "handshake_ack":
        console.log("Highport Bridge: Handshake acknowledged");
        break;
      case "node_update": {
        const result = await handleNodeUpdate(msg);
        this.send({
          type: result.success ? "ack" : "error",
          requestId: msg.requestId,
          ...result,
        });
        break;
      }
      case "ack":
        break;
      case "error":
        console.error("Highport Bridge: Server error", msg.payload);
        break;
      default:
        console.log("Highport Bridge: Received", msg.type);
    }
  }
}
