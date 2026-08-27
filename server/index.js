import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
