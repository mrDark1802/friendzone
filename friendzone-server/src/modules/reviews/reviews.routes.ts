import { Router } from "express"
import { submitReviewHandler, getPublicReviewsHandler } from "./reviews.controller.js"
import { authenticateJWT, requireVerifiedEmail } from "../../middleware/auth.middleware.js"

const router = Router()

router.get("/public", getPublicReviewsHandler)
router.post("/", authenticateJWT, requireVerifiedEmail, submitReviewHandler)

export default router
