const { google } = require("googleapis");
const { GoogleAuth } = require("google-auth-library");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

dotenv.config();

class SheetsService {
  /**
   * Ensure header row exists in Orders sheet
   */
  async ensureOrdersHeader() {
    const sheets = await this.getSheetsClient();
    const { spreadsheetId, ordersSheetName } = this.getConfig();
    // Cek apakah sudah ada data
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${ordersSheetName}!A1:H1`,
    });
    const values = res.data.values || [];
    if (!values.length || !values[0].length) {
      // Tulis header
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${ordersSheetName}!A1:H1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "timestamp",
              "name",
              "batch",
              "jenisJamu",
              "ukuran",
              "option",
              "qty",
              "notes",
            ],
          ],
        },
      });
      console.log("✅ Header Orders sheet ditulis");
    } else {
      console.log("ℹ️ Header Orders sheet sudah ada");
    }
  }
  /**
   * Ensure header row exists in Payments sheet
   */
  async ensurePaymentsHeader() {
    const sheets = await this.getSheetsClient();
    const { spreadsheetId, paymentsSheetName } = this.getConfig();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${paymentsSheetName}!A1:D1`,
    });

    const values = res.data.values || [];
    if (!values.length || !values[0].length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${paymentsSheetName}!A1:D1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [["batch", "name", "status", "timestamp"]],
        },
      });
      console.log("✅ Header Payments sheet ditulis");
    } else {
      console.log("ℹ️ Header Payments sheet sudah ada");
    }
  }

  constructor() {
    console.log("🔨 Initializing SheetsService...");
    this.authClient = null;
    this.sheetsClient = null;

    // Auto-bind methods
    this.initializeAuth = this.initializeAuth.bind(this);
    this.getSheetsClient = this.getSheetsClient.bind(this);
    this.getConfig = this.getConfig.bind(this);
    this.appendOrder = this.appendOrder.bind(this);
    this.getAllOrders = this.getAllOrders.bind(this);
    this.getPaymentsMap = this.getPaymentsMap.bind(this);
    this.setPayment = this.setPayment.bind(this);
    this.ensurePaymentsHeader = this.ensurePaymentsHeader.bind(this);
    this.testConnection = this.testConnection.bind(this);
  }

  /**
   * Initialize authentication client - FIXED VERSION
   */
  async initializeAuth() {
    if (this.authClient) {
      return this.authClient;
    }

    try {
      // Only use environment variables
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

      // Debug log
      console.log("DEBUG EMAIL:", clientEmail);
      console.log("DEBUG PRIVATE_KEY:", privateKey ? "Ada" : "Kosong");

      if (clientEmail && privateKey) {
        console.log("🔑 Using environment variables for Google Auth");
        // Fix private key format
        const fixedKey = privateKey.replace(/\\n/g, "\n");
        const jwtClient = new google.auth.JWT({
          email: clientEmail,
          key: fixedKey,
          scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });
        await jwtClient.authorize();
        this.authClient = jwtClient;
        console.log("✅ JWT authentication successful");
        return this.authClient;
      }
      throw new Error(
        "No valid authentication method found. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in .env"
      );
    } catch (error) {
      console.error("❌ Authentication failed:", error.message);
      throw error;
    }
  }

  /**
   * Get sheets client - FIXED VERSION
   */
  async getSheetsClient() {
    if (this.sheetsClient) {
      return this.sheetsClient;
    }

    try {
      const authClient = await this.initializeAuth();
      this.sheetsClient = google.sheets({ version: "v4", auth: authClient });
      return this.sheetsClient;
    } catch (error) {
      console.error("❌ Failed to create sheets client:", error.message);
      throw error;
    }
  }

  /**
   * Get configuration from environment
   */
  getConfig() {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    const ordersSheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || "Orders";
    const paymentsSheetName = process.env.PAYMENTS_SHEET_NAME || "Payments";
    const stocksSheetName = process.env.STOCKS_SHEET_NAME || "Stocks";

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEETS_ID environment variable is required");
    }

    return {
      spreadsheetId,
      ordersSheetName,
      paymentsSheetName,
      stocksSheetName,
    };
  }

  /**
   * Append order to sheet - FIXED VERSION
   */
  async appendOrder(name, batch, items, notes = "") {
    console.log("📝 appendOrder called");
    try {
      await this.ensureOrdersHeader();
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, ordersSheetName } = this.getConfig();

      const timestamp = new Date().toISOString();
      const rows = items.map((it) => [
        timestamp,
        name,
        batch,
        String(it.jenisJamu || ""),
        String(it.ukuran || ""),
        String(it.option || ""),
        Number(it.qty || 0),
        String(notes || ""),
      ]);

      console.log(`Appending ${rows.length} rows to sheet: ${ordersSheetName}`);

      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${ordersSheetName}!A:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: rows },
      });

      console.log("✅ Order appended successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Failed to append order:", error.message);
      throw error;
    }
  }

  /**
   * Get all orders from sheet - FIXED VERSION
   */
  async getAllOrders() {
    console.log("📖 getAllOrders called");
    try {
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, ordersSheetName } = this.getConfig();

      console.log(`Reading orders from sheet: ${ordersSheetName}`);

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${ordersSheetName}!A:H`,
      });

      const values = res.data.values || [];
      console.log(`Found ${values.length} rows in sheet`);

      // Skip header row if exists
      const orders = values
        .slice(1)
        .map((row, idx) => ({
          rowIndex: idx + 2,
          timestamp: row[0] || "",
          name: row[1] || "",
          batch: row[2] || "",
          jenisJamu: row[3] || "",
          ukuran: row[4] || "",
          option: row[5] || "",
          qty: Number(row[6] || 0),
          notes: row[7] || "",
        }))
        .filter((r) => r.name && r.batch && r.jenisJamu);

      console.log(`Processed ${orders.length} valid orders`);
      return orders;
    } catch (error) {
      console.error("❌ Failed to get orders:", error.message);

      if (error.message.includes("Unable to parse range")) {
        console.log("Sheet might be empty, returning empty array");
        return [];
      }
      throw error;
    }
  }

  /**
   * Get payments mapping from sheet - FIXED VERSION
   */
  async getPaymentsMap() {
    console.log("💰 getPaymentsMap called");
    try {
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, paymentsSheetName } = this.getConfig();

      console.log(`Reading payments from sheet: ${paymentsSheetName}`);

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${paymentsSheetName}!A:C`,
      });

      const values = res.data.values || [];
      const map = new Map();

      // Skip header row
      const paymentsData = values.slice(1);

      for (const row of paymentsData) {
        const batch = String(row[0] || "").trim();
        const name = String(row[1] || "").trim();
        const status = String(row[2] || "")
          .trim()
          .toLowerCase();

        if (!batch || !name) continue;

        const key = `${batch}__${name.toLowerCase()}`;
        map.set(key, status || "proses");
      }

      console.log(`Loaded ${map.size} payment records`);
      return map;
    } catch (error) {
      console.error("❌ Failed to get payments map:", error.message);

      if (error.message.includes("Unable to parse range")) {
        console.log("Payments sheet might not exist, returning empty map");
        return new Map();
      }
      return new Map();
    }
  }

  /**
   * Set payment status in sheet - FIXED VERSION
   */
  async setPayment(batch, name, status) {
    console.log("💳 setPayment called");
    try {
      await this.ensurePaymentsHeader();
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, paymentsSheetName } = this.getConfig();

      console.log(`Setting payment status for ${name} (${batch}): ${status}`);

      // First, get all current values
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${paymentsSheetName}!A:D`,
      });

      const values = res.data.values || [];

      // Find existing entries for this batch and name
      const updatedValues = values.filter((row) => {
        const rowBatch = String(row[0] || "").trim();
        const rowName = String(row[1] || "").trim();
        return !(
          rowBatch === batch && rowName.toLowerCase() === name.toLowerCase()
        );
      });

      // Add new status entry
      updatedValues.push([batch, name, status, new Date().toISOString()]);

      // Clear entire sheet
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${paymentsSheetName}!A:D`,
      });

      // Write all values back
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${paymentsSheetName}!A:D`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: updatedValues,
        },
      });

      console.log("✅ Payment status updated successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Failed to set payment:", error.message);
      throw error;
    }
  }

  /**
   * Test connection to Google Sheets
   */
  async testConnection() {
    console.log("🔌 testConnection called");
    try {
      const sheets = await this.getSheetsClient();
      const { spreadsheetId } = this.getConfig();

      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title",
      });

      console.log("✅ Connection test successful");
      console.log(`Spreadsheet title: ${response.data.properties.title}`);
      return true;
    } catch (error) {
      console.error("❌ Connection test failed:", error.message);
      return false;
    }
  }

  /**
   * Ensure header row exists in Stocks sheet
   */
  async ensureStocksHeader() {
    const sheets = await this.getSheetsClient();
    const { spreadsheetId, stocksSheetName } = this.getConfig();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${stocksSheetName}!A1:G1`,
    });

    const values = res.data.values || [];
    if (!values.length || !values[0].length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${stocksSheetName}!A1:G1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [
            [
              "timestamp",
              "jenisJamu",
              "ukuran",
              "option",
              "qty",
              "type", // 'in' untuk stok masuk, 'out' untuk pengurangan stok
              "notes", // batch number untuk out, atau keterangan untuk in
            ],
          ],
        },
      });
      console.log("✅ Header Stocks sheet ditulis");
    }
  }

  /**
   * Get current stock levels
   */
  async getStockLevels() {
    console.log("📦 getStockLevels called");
    try {
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, stocksSheetName } = this.getConfig();

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${stocksSheetName}!A:G`,
      });

      const values = res.data.values || [];
      const stockMap = new Map(); // key: jenisJamu__ukuran__option

      // Skip header row
      values.slice(1).forEach((row) => {
        const jenisJamu = String(row[1] || "");
        const ukuran = String(row[2] || "");
        const option = String(row[3] || "normal");
        const qty = Number(row[4] || 0);
        const type = String(row[5] || "").toLowerCase();

        if (!jenisJamu || !ukuran) return;

        const key = `${jenisJamu}__${ukuran}__${option}`;
        const currentStock = stockMap.get(key) || 0;

        // Add for stock in, subtract for stock out
        stockMap.set(key, currentStock + (type === "in" ? qty : -qty));
      });

      // Convert to array
      const stocks = [];
      for (const [key, qty] of stockMap.entries()) {
        const [jenisJamu, ukuran, option] = key.split("__");
        stocks.push({ jenisJamu, ukuran, option, qty });
      }

      console.log(`Loaded ${stocks.length} stock items`);
      return stocks;
    } catch (error) {
      console.error("❌ Failed to get stock levels:", error.message);
      return [];
    }
  }

  /**
   * Rewrite all orders
   */
  async rewriteOrders(orders) {
    console.log("📝 rewriteOrders called");
    try {
      await this.ensureOrdersHeader();
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, ordersSheetName } = this.getConfig();

      // Clear existing orders
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${ordersSheetName}!A2:H`,
      });

      // Write header and orders
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${ordersSheetName}!A2:H`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: orders.map((order) => [
            order.timestamp,
            order.name,
            order.batch,
            String(order.jenisJamu || ""),
            String(order.ukuran || ""),
            String(order.option || ""),
            Number(order.qty || 0),
            String(order.notes || ""),
          ]),
        },
      });

      console.log("✅ Orders rewritten successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to rewrite orders:", error.message);
      throw error;
    }
  }

  /**
   * Add stock entry (in/out)
   */
  async addStockEntry(jenisJamu, ukuran, option, qty, type, notes) {
    console.log("📥 addStockEntry called");
    try {
      await this.ensureStocksHeader();
      const sheets = await this.getSheetsClient();
      const { spreadsheetId, stocksSheetName } = this.getConfig();

      const timestamp = new Date().toISOString();
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${stocksSheetName}!A:G`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [[timestamp, jenisJamu, ukuran, option, qty, type, notes]],
        },
      });

      console.log("✅ Stock entry added successfully");
      return response.data;
    } catch (error) {
      console.error("❌ Failed to add stock entry:", error.message);
      throw error;
    }
  }
}

// Ekspor class
module.exports = SheetsService;
