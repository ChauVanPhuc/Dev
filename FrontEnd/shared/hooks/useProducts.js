import { useState, useEffect } from 'react';
import { productService } from '@web/Product/Models/product.service';

/**
 * Controller: Hook xử lý logic nghiệp vụ cho Sản phẩm
 */
export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy dữ liệu khi mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll();
      setProducts(data);
      setError(null);
    } catch (err) {
      setError('Không thể tải danh sách sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData) => {
    try {
      await productService.create(productData);
      await fetchProducts(); // Refresh danh sách
      return true;
    } catch (err) {
      setError('Lỗi khi thêm sản phẩm');
      return false;
    }
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    addProduct
  };
};
