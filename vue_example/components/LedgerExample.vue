<template>
  <div class="Ledger">
    <br />
    <!--
        Commands
    -->
    <button @click="getVersion">
      Get Version
    </button>

    <button @click="appInfo">
      AppInfo
    </button>

    <button @click="getAddress">
      Get Address
    </button>

    <button @click="showAddress">
      Show Address
    </button>

    <button @click="signExampleTx">
      Sign Example TX
    </button>
    <!--
        Commands
    -->
    <ul id="ledger-status">
      <li v-for="item in ledgerStatus" :key="item.index">
        {{ item.msg }}
      </li>
    </ul>
  </div>
</template>

<script>
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
// eslint-disable-next-line import/no-extraneous-dependencies
import TransportU2F from "@ledgerhq/hw-transport-u2f";
import LedgerApp from "../../src";

const txBlobStr =
  "0400ff8d16d62802ca55326ec52bf76a8543b90e2aba5bcf6cd195c0d6fc1ef38fa1b333158139ae28a3df" +
  "aac5fe1560a5e9e05c31000000c80100003fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458d" +
  "a48fcd425baf3fd7b9eb6a00376e5be61f01abb429ffb0b104be05eaff4d458da48fcd425baf";

export default {
  name: "Ledger",
  props: {},
  data() {
    return {
      deviceLog: [],
      transportChoice: "WebUSB",
    };
  },
  computed: {
    ledgerStatus() {
      return this.deviceLog;
    },
  },
  methods: {
    log(msg) {
      this.deviceLog.push({
        index: this.deviceLog.length,
        msg,
      });
    },
    async getTransport() {
      let transport = null;

      this.log(`Trying to connect via ${this.transportChoice}...`);
      if (this.transportChoice === "WebUSB") {
        try {
          transport = await TransportWebUSB.create();
        } catch (e) {
          this.log(e);
        }
      }

      return transport;
    },
    async getVersion() {
      this.deviceLog = [];

      // Given a transport it is possible instantiate the app
      const transport = await this.getTransport();
      const app = newKusamaApp(transport);

      // now it is possible to access all commands in the app
      const response = await app.getVersion();
      if (response.return_code !== ERROR_CODE.NoError) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);
      this.log("Full response:");
      this.log(response);
    },
    async appInfo() {
      this.deviceLog = [];

      // Given a transport it is possible instantiate the app
      const transport = await this.getTransport();
      const app = newKusamaApp(transport);

      // now it is possible to access all commands in the app
      const response = await app.appInfo();
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log(response);
    },
  },
    async getAddress() {
      this.deviceLog = [];

      // Given a transport it is possible instantiate the app
      const transport = await this.getTransport();
      const app = newKusamaApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      const pathAccount = 0x80000000;
      const pathChange = 0x80000000;
      const pathIndex = 0x80000000;
      response = await app.getAddress(pathAccount, pathChange, pathIndex, false);
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
    async showAddress() {
      this.deviceLog = [];

      // Given a transport it is possible instantiate the app
      const transport = await this.getTransport();
      const app = newKusamaApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      this.log("Please click in the device");
      const pathAccount = 0x80000000;
      const pathChange = 0x80000000;
      const pathIndex = 0x80000000;
      response = await app.getAddress(pathAccount, pathChange, pathIndex, true);
      if (response.return_code !== 0x9000) {
        this.log(`Error [${response.return_code}] ${response.error_message}`);
        return;
      }

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
    async signExampleTx() {
      this.deviceLog = [];

      // Given a transport it is possible instantiate the app
      const transport = await this.getTransport();
      const app = newKusamaApp(transport);

      let response = await app.getVersion();
      this.log(`App Version ${response.major}.${response.minor}.${response.patch}`);
      this.log(`Device Locked: ${response.device_locked}`);
      this.log(`Test mode: ${response.test_mode}`);

      // now it is possible to access all commands in the app
      const message = Buffer.from(txBlobStr, "hex");
      const pathAccount = 0x80000000;
      const pathChange = 0x80000000;
      const pathIndex = 0x80000000;
      response = await app.sign(pathAccount, pathChange, pathIndex, message);

      this.log("Response received!");
      this.log("Full response:");
      this.log(response);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}

button {
  padding: 5px;
  font-weight: bold;
  font-size: medium;
}

ul {
  padding: 10px;
  text-align: left;
  alignment: left;
  list-style-type: none;
  background: black;
  font-weight: bold;
  color: greenyellow;
}
</style>
