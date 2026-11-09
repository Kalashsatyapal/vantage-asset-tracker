
import { Router } from "express";
import {
  getMyProfile,
  updateMyProfile
} from "../controllers/profileController.js";

import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);

export default router;
