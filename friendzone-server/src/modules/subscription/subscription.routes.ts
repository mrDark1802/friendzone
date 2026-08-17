import { Router } from 'express';
import {
  createCheckoutSessionHandler,
  verifyPaymentHandler,
  changePlanHandler,
  handleWebhookHandler,
} from './subscription.controller.js';
import { authenticateJWT, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

const subscriptionRouter = Router();

// Public webhook route (Handled with raw body in express app)
subscriptionRouter.post('/webhook', handleWebhookHandler);

// Authenticated user routes
subscriptionRouter.use(authenticateJWT);
subscriptionRouter.use(requireVerifiedEmail);

subscriptionRouter.post('/create-checkout-session', createCheckoutSessionHandler);
subscriptionRouter.post('/verify-payment', verifyPaymentHandler);
subscriptionRouter.post('/change-plan', changePlanHandler);

export default subscriptionRouter;
