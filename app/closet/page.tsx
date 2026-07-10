"use client";

import { useState } from "react";

export default function ClosetPage() {
    const [showForm, setShowForm] = useState(false);
    const [brand, setBrand] = useState("");
    const [itemName, setItemName] = useState("");
    const [category, setCategory] = useState("");

    const [items, setItems] = useState<any[]>([]);
   
    const handleSave = () => {

      console.log({
        brand,
        itemName,
        category,
      });
    
      const newItems = [
        ...items,
        {
          brand,
          itemName,
          category,
        },
      ];
      
      
      setItems(newItems);
    
      setBrand("");
      setItemName("");
      setCategory("");
      setShowForm(false);
    };

    return (
      <main className="min-h-screen bg-white p-12">
        <h1 className="text-5xl font-light mb-6">
          My Closet
        </h1>
  
        <p className="text-xl text-gray-500">
          Your wardrobe will live here.
        </p>
        {showForm ? (
  <div className="mt-12 max-w-lg space-y-4">
  <h2 className="text-2xl font-light mb-6">
    Add Clothing
  </h2>

  <input
  type="text"
  placeholder="Brand"
  value={brand}
  onChange={(e) => setBrand(e.target.value)}
  className="w-full border rounded-lg p-3"
/>

<input
  type="text"
  placeholder="Item Name"
  value={itemName}
  onChange={(e) => setItemName(e.target.value)}
  className="w-full border rounded-lg p-3"
/>

<select
  value={category}
  onChange={(e) => setCategory(e.target.value)}
  className="w-full border rounded-lg p-3"
>
    <option>Category</option>
    <option>Top</option>
    <option>Bottom</option>
    <option>Dress</option>
    <option>Shoes</option>
    <option>Outerwear</option>
  </select>

  <button
  onClick={handleSave}
  className="rounded-xl bg-black text-white px-6 py-3"
>
  Save Item
</button>

</div>
) : (
  <button
    className="rounded-xl bg-black text-white px-6 py-3 hover:bg-gray-800"
    onClick={() => setShowForm(true)}
  >
    Add Clothing
  </button>
)}
<div className="mt-12">
  <h2 className="text-2xl font-light mb-4">
    My Items
  </h2>

  {items.map((item, index) => (
    <div
      key={index}
      className="border rounded-xl p-4 mb-3"
    >
      <p><strong>Brand:</strong> {item.brand}</p>
      <p><strong>Item:</strong> {item.itemName}</p>
      <p><strong>Category:</strong> {item.category}</p>
    </div>
  ))}
</div>

      </main>
    );
  }