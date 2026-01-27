/**
 * FoundryBridge - WebSocket connection to PlaneShift server
 */
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
      console.log("PlaneShift Bridge: Connected");
      this.reconnectAttempts = 0;
      this.send({ 
        type: "handshake", 
        apiKey: this.apiKey,
        clientType: "foundry",
        version: "1.0.0"
      });
    };

    this.ws.onclose = () => {
      console.log("PlaneShift Bridge: Disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error("PlaneShift Bridge: WebSocket error", error);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error("PlaneShift Bridge: Failed to parse message", e);
      }
    };
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("PlaneShift Bridge: Max reconnect attempts reached");
      return;
    }
    const delay = Math.min(this.reconnectDelay * (2 ** this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`PlaneShift Bridge: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
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

  handleMessage(msg) {
    console.log("PlaneShift Bridge: Received message", msg.type);
  }
}
