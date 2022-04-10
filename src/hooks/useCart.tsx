import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const currentCart = [...cart];
      const productExists = currentCart.find(
        (product) => product.id === productId,
      );

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      const currentAmount = productExists ? productExists?.amount : 0;
      const newAmount = currentAmount + 1;

      if (newAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount = newAmount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1,
        };

        currentCart.push(newProduct);
      }

      setCart(currentCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(currentCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];
      const productExistsInTheCart = currentCart.find(
        (product) => product.id === productId,
      );

      if (productExistsInTheCart) {
        const cartWithProductRemoved = currentCart.filter(
          (product) => product.id !== productId,
        );

        setCart(cartWithProductRemoved);
        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(cartWithProductRemoved),
        );
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const currentCart = [...cart];
      const productExists = currentCart.find(
        (product) => product.id === productId,
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(currentCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(currentCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
