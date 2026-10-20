import { useCallback, useEffect, useRef, useState } from "react";
import { api, type Page, type Product, type ProductQuery } from "./api";

/** Tri hoan gia tri — dung cho o tim kiem de khong goi API sau moi phim. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

type State = {
  data: Page<Product> | null;
  loading: boolean;
  error: string | null;
};

/**
 * SOS07/SOS08 — tai danh sach san pham tu API.
 *
 * Tim kiem / sap xep / phan trang deu do backend xu ly (Pageable),
 * frontend khong tai toan bo roi loc lai.
 *
 * Ket qua cua request cu bi huy bang AbortController nen UI khong hien nham
 * du lieu ve muon hon.
 */
export function useProducts(query: ProductQuery) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const { name, categoryId, occasion, color, minPrice, maxPrice, page, size, sort } = query;

  useEffect(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((previous) => ({ ...previous, loading: true, error: null }));

    api
      .listProducts(
        { name, categoryId, occasion, color, minPrice, maxPrice, page, size, sort },
        controller.signal,
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Không tải được danh sách hoa.",
        });
      });

    return () => controller.abort();
  }, [name, categoryId, occasion, color, minPrice, maxPrice, page, size, sort, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { ...state, reload };
}
