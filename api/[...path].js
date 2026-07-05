// Single catch-all Vercel Function serving every /api/* route.
//
// Vercel's Hobby plan caps deployments at 12 Serverless Functions. This project has
// 50+ API endpoints, so they live as plain modules under api/_handlers/ (a leading
// underscore keeps Vercel from treating them as functions) and are dispatched here
// by exact pathname — one function total instead of one per endpoint.
import { j } from './_utils/response.js';

import adminAllApiKeys from "./_handlers/admin-all-api-keys.js";
import adminAnalytics from "./_handlers/admin-analytics.js";
import adminCreateUser from "./_handlers/admin-create-user.js";
import adminExternalCredentials from "./_handlers/admin-external-credentials.js";
import adminMigratePlans from "./_handlers/admin-migrate-plans.js";
import adminPlans from "./_handlers/admin-plans.js";
import adminRevenue from "./_handlers/admin-revenue.js";
import adminStaff from "./_handlers/admin-staff.js";
import adminStats from "./_handlers/admin-stats.js";
import adminSupportTickets from "./_handlers/admin-support-tickets.js";
import adminUpdateUser from "./_handlers/admin-update-user.js";
import adminUsers from "./_handlers/admin-users.js";
import authChangePassword from "./_handlers/auth-change-password.js";
import barcodesMyList from "./_handlers/barcodes-my-list.js";
import barcodesSave from "./_handlers/barcodes-save.js";
import dashboardStats from "./_handlers/dashboard-stats.js";
import devAccount from "./_handlers/dev-account.js";
import devKeys from "./_handlers/dev-keys.js";
import devTopup from "./_handlers/dev-topup.js";
import devUsage from "./_handlers/dev-usage.js";
import devWallet from "./_handlers/dev-wallet.js";
import health from "./_handlers/health.js";
import keysGenerate from "./_handlers/keys-generate.js";
import keysList from "./_handlers/keys-list.js";
import keysRevoke from "./_handlers/keys-revoke.js";
import paymentsStatus from "./_handlers/payments-status.js";
import paynowCallback from "./_handlers/paynow-callback.js";
import paynowInitiate from "./_handlers/paynow-initiate.js";
import productsCatalog from "./_handlers/products-catalog.js";
import productsVariations from "./_handlers/products-variations.js";
import profileMe from "./_handlers/profile-me.js";
import profileUpdate from "./_handlers/profile-update.js";
import settingsClearData from "./_handlers/settings-clear-data.js";
import stripeCreateCheckoutSession from "./_handlers/stripe-create-checkout-session.js";
import stripeWebhook from "./_handlers/stripe-webhook.js";
import supportChatClaim from "./_handlers/support-chat-claim.js";
import supportChatEnd from "./_handlers/support-chat-end.js";
import supportChatMessage from "./_handlers/support-chat-message.js";
import supportChatMessages from "./_handlers/support-chat-messages.js";
import supportChatStart from "./_handlers/support-chat-start.js";
import supportTicketsCreate from "./_handlers/support-tickets-create.js";
import supportTicketsList from "./_handlers/support-tickets-list.js";
import supportTicketsReply from "./_handlers/support-tickets-reply.js";
import supportTicketsUpdate from "./_handlers/support-tickets-update.js";
import teamInvite from "./_handlers/team-invite.js";
import teamMembers from "./_handlers/team-members.js";
import teamRemove from "./_handlers/team-remove.js";
import v1BarcodesBulk from "./_handlers/v1-barcodes-bulk.js";
import v1BarcodesGenerate from "./_handlers/v1-barcodes-generate.js";
import v1BarcodesList from "./_handlers/v1-barcodes-list.js";
import v1ProductsDelete from "./_handlers/v1-products-delete.js";
import v1ProductsList from "./_handlers/v1-products-list.js";
import v1QrGenerate from "./_handlers/v1-qr-generate.js";

const routes = {
  "/api/admin/all-api-keys": adminAllApiKeys,
  "/api/admin/analytics": adminAnalytics,
  "/api/admin/create-user": adminCreateUser,
  "/api/admin/external-credentials": adminExternalCredentials,
  "/api/admin/migrate-plans": adminMigratePlans,
  "/api/admin/plans": adminPlans,
  "/api/admin/revenue": adminRevenue,
  "/api/admin/staff": adminStaff,
  "/api/admin/stats": adminStats,
  "/api/admin/support-tickets": adminSupportTickets,
  "/api/admin/update-user": adminUpdateUser,
  "/api/admin/users": adminUsers,
  "/api/auth/change-password": authChangePassword,
  "/api/barcodes/my-list": barcodesMyList,
  "/api/barcodes/save": barcodesSave,
  "/api/dashboard/stats": dashboardStats,
  "/api/dev/account": devAccount,
  "/api/dev/keys": devKeys,
  "/api/dev/topup": devTopup,
  "/api/dev/usage": devUsage,
  "/api/dev/wallet": devWallet,
  "/api/health": health,
  "/api/keys/generate": keysGenerate,
  "/api/keys/list": keysList,
  "/api/keys/revoke": keysRevoke,
  "/api/payments/status": paymentsStatus,
  "/api/paynow/callback": paynowCallback,
  "/api/paynow/initiate": paynowInitiate,
  "/api/products/catalog": productsCatalog,
  "/api/products/variations": productsVariations,
  "/api/profile/me": profileMe,
  "/api/profile/update": profileUpdate,
  "/api/settings/clear-data": settingsClearData,
  "/api/stripe/create-checkout-session": stripeCreateCheckoutSession,
  "/api/stripe/webhook": stripeWebhook,
  "/api/support/chat/claim": supportChatClaim,
  "/api/support/chat/end": supportChatEnd,
  "/api/support/chat/message": supportChatMessage,
  "/api/support/chat/messages": supportChatMessages,
  "/api/support/chat/start": supportChatStart,
  "/api/support/tickets/create": supportTicketsCreate,
  "/api/support/tickets/list": supportTicketsList,
  "/api/support/tickets/reply": supportTicketsReply,
  "/api/support/tickets/update": supportTicketsUpdate,
  "/api/team/invite": teamInvite,
  "/api/team/members": teamMembers,
  "/api/team/remove": teamRemove,
  "/api/v1/barcodes/bulk": v1BarcodesBulk,
  "/api/v1/barcodes/generate": v1BarcodesGenerate,
  "/api/v1/barcodes/list": v1BarcodesList,
  "/api/v1/products/delete": v1ProductsDelete,
  "/api/v1/products/list": v1ProductsList,
  "/api/v1/qr/generate": v1QrGenerate,
};

export default async function handler(req) {
  const { pathname } = new URL(req.url);
  const fn = routes[pathname];
  if (!fn) return j({ error: 'Not found' }, 404);
  return fn(req);
}

export const config = { maxDuration: 30 };
