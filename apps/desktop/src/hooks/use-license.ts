import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as keygen from "tauri-plugin-keygen-api";

const LICENSE_QUERY_KEY = ["license"] as const;

// https://github.com/bagindo/tauri-plugin-keygen
export function useLicense() {
  const queryClient = useQueryClient();

  const getLicense = useQuery({
    queryKey: LICENSE_QUERY_KEY,
    queryFn: async () => {
      // Check if license check is disabled via environment variable
      if (import.meta.env.VITE_DISABLE_LICENSE_CHECK === "true") {
        return {
          valid: true,
          expiry: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000
          ).toISOString(), // 1 year from now
          key: "dev-bypass-key-••••••••••••••••",
          entitlements: [],
          metadata: {
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        };
      }

      const license = await keygen.getLicense();
      if (license?.valid) {
        return license;
      }
      return null;
    },
    refetchInterval: 1000 * 60 * 1,
    // This is important for immediate refresh
    refetchIntervalInBackground: true,
  });

  const refreshLicense = useMutation({
    mutationFn: async () => {
      const cachedKey = await keygen.getLicenseKey();
      if (!cachedKey) {
        throw new Error("no_license_key_found");
      }

      const license = await keygen.validateCheckoutKey({
        key: cachedKey,
        entitlements: [],
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
        ttlForever: false,
      });

      return license;
    },
    onError: (e) => {
      console.error(e);
      queryClient.setQueryData(LICENSE_QUERY_KEY, null);
    },
    onSuccess: (license) => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, license);
    },
  });

  const shouldRefresh = () => {
    const license = getLicense.data;
    if (!license || !license.valid) {
      return false;
    }

    if (!license.expiry) {
      throw new Error("license.expiry is null");
    }

    const daysUntilExpiry = Math.floor(
      (new Date(license.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
  };

  const activateLicense = useMutation({
    mutationFn: async (key: string) => {
      const license = await keygen.validateCheckoutKey({
        key,
        entitlements: [],
        ttlSeconds: 60 * 60 * 24 * 7, // 7 days
        ttlForever: false,
      });
      return license;
    },
    onError: console.error,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEY });
    },
  });

  const deactivateLicense = useMutation({
    mutationFn: async () => {
      await Promise.all([keygen.resetLicense(), keygen.resetLicenseKey()]);
      return null;
    },
    onError: console.error,
    onSuccess: () => {
      queryClient.setQueryData(LICENSE_QUERY_KEY, null);
    },
  });

  return {
    getLicense,
    activateLicense,
    deactivateLicense,
    shouldRefresh,
    refreshLicense,
  };
}
