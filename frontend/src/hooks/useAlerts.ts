import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";
import {
  fetchAlerts,
  createAlert,
  removeAlert,
  Alert,
  AlertIn,
} from "../api/alerts";

export const useAlerts = (): {
  list: UseQueryResult<Alert[], Error>;
  add: UseMutationResult<Alert, unknown, AlertIn>;
  del: UseMutationResult<boolean, unknown, string>;
} => {
  const qc = useQueryClient();

  // keep the whole query object, not just data
  const list = useQuery<Alert[], Error>({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    // you can turn on refetch on window focus if you like:
    // refetchOnWindowFocus: false,
  });

  const add = useMutation<Alert, unknown, AlertIn>({
    mutationFn: (payload) => createAlert(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  const del = useMutation<boolean, unknown, string>({
    mutationFn: (id) => removeAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  return { list, add, del };
};
