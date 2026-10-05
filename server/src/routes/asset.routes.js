import { Router } from "express";
import {
  listAssets,
  getAssetDetail,
  createAsset,
  updateAsset,
  deleteAsset,
} from "../controllers/asset.controller.js";

const router = Router();

router.get("/", listAssets);
router.get("/:assetId", getAssetDetail);
router.post("/", createAsset);
router.patch("/:assetId", updateAsset);
router.delete("/:assetId", deleteAsset);

export default router;
