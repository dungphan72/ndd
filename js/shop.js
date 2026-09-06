/**
 * Shop & Equipment Marketplace Module for Nhomdinhduong.vn
 */

const ShopManager = {
  // Lấy danh sách sản phẩm từ LocalStorage
  getProducts() {
    try {
      const products = localStorage.getItem("nutriclub_products");
      if (products) {
        const parsed = JSON.parse(products);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Error loading products from localStorage:", e);
    }
    return typeof SEED_PRODUCTS !== "undefined" ? SEED_PRODUCTS : [];
  },

  // Lưu danh sách sản phẩm
  saveProducts(products) {
    try {
      localStorage.setItem("nutriclub_products", JSON.stringify(products));
    } catch (e) {
      console.error("Error saving products to localStorage:", e);
    }
  },

  // Lấy danh sách Đơn hàng từ LocalStorage
  getOrders() {
    try {
      const orders = localStorage.getItem("nutriclub_orders");
      if (orders) {
        const parsed = JSON.parse(orders);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error loading orders:", e);
    }
    return [];
  },

  // Lưu danh sách Đơn hàng
  saveOrders(orders) {
    try {
      localStorage.setItem("nutriclub_orders", JSON.stringify(orders));
    } catch (e) {
      console.error("Error saving orders:", e);
    }
  },

  // Tạo Đơn hàng mới
  createOrder(orderData) {
    const orders = this.getOrders();
    const newOrder = {
      id: "ord_" + Date.now(),
      productId: orderData.productId || null,
      productTitle: orderData.productTitle || "Công cụ dinh dưỡng",
      price: parseFloat(orderData.price) || 0,
      quantity: parseInt(orderData.quantity) || 1,
      totalAmount: (parseFloat(orderData.price) || 0) * (parseInt(orderData.quantity) || 1),
      buyerName: (orderData.buyerName || "").trim(),
      buyerPhone: (orderData.buyerPhone || "").trim(),
      address: (orderData.address || "").trim(),
      paymentMethod: orderData.paymentMethod || "COD (Thanh toán khi nhận hàng)",
      note: (orderData.note || "").trim(),
      sellerName: orderData.sellerName || "Chủ nhóm",
      sellerPhone: orderData.sellerPhone || "",
      orderDate: new Date().toLocaleDateString("vi-VN") + " " + new Date().toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' }),
      status: orderData.status || "pending"
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);
    return { success: true, order: newOrder };
  },

  // Cập nhật trạng thái Đơn hàng
  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].status = newStatus;
      this.saveOrders(orders);
      return { success: true, order: orders[orderIndex] };
    }
    return { success: false };
  },

  // Xóa Đơn hàng
  deleteOrder(orderId) {
    const orders = this.getOrders().filter(o => o.id !== orderId);
    this.saveOrders(orders);
    return { success: true };
  },

  // Lấy sản phẩm theo ID
  getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id);
  },

  // Xóa sản phẩm khỏi Shop
  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.saveProducts(products);
  },

  // Lọc sản phẩm theo danh mục, từ khóa & giá
  filterProducts(filters = {}) {
    let products = this.getProducts();
    const { category, keyword, sort } = filters;

    // 1. Lọc danh mục
    if (category && category !== "all") {
      products = products.filter(p => p.category === category);
    }

    // 2. Lọc từ khóa
    if (keyword && keyword.trim()) {
      const q = keyword.toLowerCase().trim();
      products = products.filter(p => 
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.sellerName || '').toLowerCase().includes(q) ||
        (p.province || '').toLowerCase().includes(q)
      );
    }

    // 3. Sắp xếp giá
    if (sort === "price-asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      products.sort((a, b) => b.price - a.price);
    }

    return products;
  },

  // Định dạng giá tiền Việt Nam Đồng
  formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  },

  // Tạo sản phẩm / công cụ mới
  createProduct(productData) {
    const currentUser = AuthManager.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: "Vui lòng đăng nhập để đăng bán công cụ!" };
    }

    const products = this.getProducts();
    const newProduct = {
      id: "prod_" + Date.now(),
      title: productData.title,
      category: productData.category || "Cân & Máy Quét InBody",
      price: parseFloat(productData.price) || 0,
      condition: productData.condition || "Mới 100%",
      image: productData.image || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
      province: productData.province || "Hà Nội",
      sellerName: currentUser.name,
      sellerPhone: currentUser.phone,
      description: productData.description || "Công cụ mở nhóm dinh dưỡng chất lượng cao.",
      shopeeLink: (productData.shopeeLink || "").trim()
    };

    products.unshift(newProduct);
    this.saveProducts(products);
    return { success: true, product: newProduct };
  },

  // Render danh sách sản phẩm dạng thẻ Card
  renderProductCards(products) {
    if (!products || products.length === 0) {
      return `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-solid fa-store"></i></div>
          <h3>Chưa có sản phẩm nào phù hợp</h3>
          <p>Hãy thử chọn danh mục khác hoặc đăng bán dụng cụ mở nhóm dinh dưỡng của bạn!</p>
          <button class="btn btn-primary" onclick="App.openCreateProductModal()">
            <i class="fa-solid fa-plus"></i> Đăng Bán Công Cụ Mới
          </button>
        </div>
      `;
    }

    return products.map(p => {
      const safeTitle = escapeHtml(p.title || '');
      const safeCondition = escapeHtml(p.condition || '');
      const safeCategory = escapeHtml(p.category || '');
      const safeSellerName = escapeHtml(p.sellerName || '');
      const safeProvince = escapeHtml(p.province || '');
      const safeImage = sanitizeUrl(p.image, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80');
      const safeShopeeLink = sanitizeUrl(p.shopeeLink, '');

      return `
      <div class="product-card" onclick="ShopManager.showProductDetailModal('${escapeJsAttr(p.id)}')">
        <div class="product-img-wrap">
          <img src="${safeImage}" class="product-img" alt="${safeTitle}" onerror="this.src='https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80'">
          <span class="product-condition-badge">${safeCondition}</span>
          <span class="product-cat-badge">${safeCategory}</span>
          ${safeShopeeLink ? '<span class="product-shopee-badge"><i class="fa-solid fa-cart-shopping"></i> Shopee</span>' : ''}
        </div>
        <div class="product-body">
          <h3 class="product-title">${safeTitle}</h3>
          <div class="product-price">${this.formatCurrency(p.price)}</div>

          <div class="product-seller-row">
            <div class="seller-info">
              <span class="seller-label">Người đăng:</span>
              <span class="seller-name">${safeSellerName}</span>
            </div>
            <span class="product-loc-tag"><i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${safeProvince}</span>
          </div>

          <div class="product-cta-group">
            <button class="btn btn-primary product-btn" style="font-weight: 700; flex-grow: 1;" onclick="event.stopPropagation(); App.openCreateOrderModal('${escapeJsAttr(p.id)}')">
              <i class="fa-solid fa-cart-shopping"></i> Đặt Mua Ngay
            </button>
            ${safeShopeeLink ? `
              <button class="btn product-shopee-btn" onclick="event.stopPropagation(); window.open('${escapeJsAttr(safeShopeeLink)}', '_blank', 'noopener')">
                <i class="fa-solid fa-store"></i> Shopee
              </button>
            ` : ''}
            <button class="btn btn-outline product-btn" onclick="event.stopPropagation(); ShopManager.showProductDetailModal('${escapeJsAttr(p.id)}')">
              <i class="fa-solid fa-eye"></i> Chi Tiết
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('');
  },

  // Hiển thị Modal Chi Tiết Sản Phẩm
  showProductDetailModal(productId) {
    const product = this.getProductById(productId);
    if (!product) return;

    const modalContent = document.getElementById("productDetailModalBody");
    const modalTitle = document.getElementById("productDetailModalTitle");

    if (modalTitle) modalTitle.innerText = product.title;

    const maskedPhone = maskPhone(product.sellerPhone || '0902030185');
    const isVIP = AuthManager.isVIPUser();
    const contactPhone = isVIP ? (product.sellerPhone || '0902030185') : maskedPhone;

    const safeTitle = escapeHtml(product.title || '');
    const safeCondition = escapeHtml(product.condition || '');
    const safeCategory = escapeHtml(product.category || '');
    const safeProvince = escapeHtml(product.province || '');
    const safeSellerName = escapeHtml(product.sellerName || '');
    const safeDescription = escapeHtml(product.description || '');
    const safeContactPhone = escapeHtml(contactPhone);
    const safeImage = sanitizeUrl(product.image, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80');
    const safeShopeeLink = sanitizeUrl(product.shopeeLink, '');
    const safeTelHref = encodeURIComponent(isVIP ? (product.sellerPhone || '0902030185') : '0902030185');

    if (modalContent) {
      modalContent.innerHTML = `
        <div class="product-detail-hero">
          <img src="${safeImage}" class="product-detail-img" alt="${safeTitle}">
          <span class="product-condition-badge" style="top: 16px; right: 16px; font-size: 0.85rem; padding: 6px 14px;">${safeCondition}</span>
        </div>

        <div style="margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
            <div>
              <span class="product-cat-badge" style="position: static; display: inline-block; margin-bottom: 8px;">${safeCategory}</span>
              <h2 style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); line-height: 1.3;">${safeTitle}</h2>
            </div>
            <div style="font-size: 1.6rem; font-weight: 900; color: var(--primary);">${this.formatCurrency(product.price)}</div>
          </div>

          ${safeShopeeLink ? `
            <a href="${safeShopeeLink}" target="_blank" rel="noopener noreferrer" class="btn product-shopee-btn" style="width: 100%; padding: 12px; font-size: 1rem; margin-bottom: 16px;">
              <i class="fa-solid fa-cart-shopping"></i> Mua Ngay Trên Shopee
            </a>
          ` : ''}

          <div style="display: flex; align-items: center; gap: 16px; font-size: 0.9rem; color: var(--text-muted); padding: 12px; background: var(--bg-main); border-radius: var(--radius-md); margin-bottom: 16px;">
            <div>📍 <strong>Khu vực:</strong> ${safeProvince}</div>
            <div>📦 <strong>Tình trạng:</strong> ${safeCondition}</div>
          </div>

          <!-- Thông tin người bán -->
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 18px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 10px;">👤 Thông Tin Người Bán / Nhà Cung Cấp:</h4>
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div>
                <div style="font-weight: 700; font-size: 1.02rem;">${safeSellerName}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Hotline / Zalo: <strong>${safeContactPhone}</strong> ${!isVIP ? '<span style="color:#ef4444; font-weight:700;">(🔒 Đã che)</span>' : ''}</div>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-primary" style="font-weight: 800; padding: 8px 16px; font-size: 0.92rem;" onclick="App.openCreateOrderModal('${escapeJsAttr(product.id)}')">
                  🛒 Đặt Mua Trực Tiếp
                </button>
                <a href="https://zalo.me/0902030185" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="background: rgba(0, 104, 255, 0.1); color: #0068ff; border-color: #0068ff;">
                  💬 Chat Zalo
                </a>
                <a href="tel:${safeTelHref}" class="btn btn-outline">
                  📞 Gọi Điện
                </a>
              </div>
            </div>
          </div>

          <!-- Mô tả chi tiết -->
          <div>
            <h4 style="font-size: 1rem; font-weight: 800; color: var(--primary); margin-bottom: 8px;">📋 Mô Tả Chi Tiết Công Cụ:</h4>
            <div style="font-size: 0.95rem; color: var(--text-main); line-height: 1.65; white-space: pre-line; background: var(--bg-main); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              ${safeDescription}
            </div>
          </div>
        </div>
      `;
    }

    App.openModal("productDetailModal");
  }
};

if (typeof window !== "undefined") {
  window.ShopManager = ShopManager;
}

