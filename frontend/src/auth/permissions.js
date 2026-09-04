export const ROLES = {
  COLLECTOR: "collector",
  RECYCLER: "recycler",
  ADMIN: "admin"
};

export const ROLE_PERMISSIONS = {
  [ROLES.COLLECTOR]: [
    "collector_dashboard",
    "create_lot",
    "view_my_lots",
    "view_lot_details",
    "view_price_board",
    "find_recyclers",
    "view_recycler_details",
    "view_my_offers",
    "view_qr_passport",
    "handover_lot",
    "view_earnings",
    "view_transactions",
    "view_safety",
    "view_profile"
  ],

  [ROLES.RECYCLER]: [
    "recycler_dashboard",
    "authorization",
    "verification_status",
    "view_available_lots",
    "view_lot_details",
    "make_offer",
    "view_my_offers",
    "view_accepted_lots",
    "scan_qr",
    "handover_lot",
    "view_received_materials",
    "view_processing_status",
    "view_transactions",
    "view_profile"
  ],

  [ROLES.ADMIN]: [
    "admin_dashboard",
    "manage_collectors",
    "manage_recyclers",
    "verify_recyclers",
    "review_authorization",
    "manage_materials",
    "manage_prices",
    "view_transactions",
    "view_traceability",
    "manage_dataset",
    "view_analytics",
    "view_reports"
  ]
};

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role, permission) {
  if (!role || !permission) {
    return false;
  }

  const permissions = ROLE_PERMISSIONS[role];

  if (!permissions) {
    return false;
  }

  return permissions.includes(permission);
}

/**
 * Check whether a role is allowed for a route.
 */
export function hasRole(role, allowedRoles) {
  if (!role || !Array.isArray(allowedRoles)) {
    return false;
  }

  return allowedRoles.includes(role);
}