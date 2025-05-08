import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFavourites,
  createFavourite,
  removeFavourite,
  Favourite,
  FavouriteIn,
} from "../api/favourites";

export const useFavourites = () => {
  const qc = useQueryClient();

  const { data: list = [] as Favourite[], isLoading: isListLoading } = useQuery<
    Favourite[]
  >({
    queryKey: ["favourites"],
    queryFn: fetchFavourites,
  });

  const add = useMutation<Favourite, unknown, FavouriteIn>({
    mutationFn: createFavourite,
    // optimistic update
    onMutate: async (newFav) => {
      await qc.cancelQueries(["favourites"]);
      const previous = qc.getQueryData<Favourite[]>(["favourites"]) || [];
      const optimistic: Favourite = {
        id: `temp-${Date.now()}`,
        ...newFav,
      } as any;
      qc.setQueryData(["favourites"], [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _newFav, ctx: any) => {
      ctx?.previous && qc.setQueryData(["favourites"], ctx.previous);
    },
    onSuccess: (saved) => {
      qc.setQueryData<Favourite[]>(["favourites"], (old = []) =>
        old.map((f) => (f.id.toString().startsWith("temp-") ? saved : f))
      );
    },
    onSettled: () => qc.invalidateQueries(["favourites"]),
  });

  const del = useMutation<boolean, unknown, string>({
    mutationFn: removeFavourite,
    // optimistic removal
    onMutate: async (id) => {
      await qc.cancelQueries(["favourites"]);
      const previous = qc.getQueryData<Favourite[]>(["favourites"]) || [];
      qc.setQueryData(
        ["favourites"],
        previous.filter((f) => f.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, ctx: any) => {
      ctx?.previous && qc.setQueryData(["favourites"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries(["favourites"]),
  });

  return {
    list,
    isListLoading,
    add,
    del,
    isAdding: add.isLoading,
    isRemoving: del.isLoading,
  };
};
