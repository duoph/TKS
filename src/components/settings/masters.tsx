"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ImageUp, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Field, NativeSelect } from "@/components/shared/field";
import { FilterPills, Panel } from "@/components/shared/page-header";
import { ProductImage } from "@/components/shared/product-image";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveCategory, saveProduct, saveUser, setProductActive } from "@/data/api";
import { useStore } from "@/data/store";
import type { Category, Product, Role, User } from "@/data/types";
import { inr, kgNum } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { positiveNumber, requiredText, toNumber } from "@/lib/validation";

function FormDialog({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && children}
      </DialogContent>
    </Dialog>
  );
}

function FormButtons({ onCancel, label }: { onCancel: () => void; label: string }) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" className="h-10" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" className="h-10">
        {label}
      </Button>
    </DialogFooter>
  );
}

// ---------------------------------------------------------------- products

/** Shrinks a chosen photo to a small JPEG so it fits in browser storage. */
function fileToThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = 360;
      const height = 240;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error("no canvas"));
      // Centre-crop to 3:2 so every tile has the same shape.
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

const productSchema = z.object({
  name: requiredText("Name"),
  categoryId: requiredText("Category"),
  code: requiredText("Short code"),
  retailPrice: positiveNumber("Retail price"),
  wholesalePrice: positiveNumber("Wholesale price"),
  lowStockKg: positiveNumber("Low-stock level"),
});
type ProductValues = z.infer<typeof productSchema>;

function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const categories = useStore((s) => s.categories);
  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          categoryId: product.categoryId,
          code: product.code,
          retailPrice: String(product.retailPrice),
          wholesalePrice: String(product.wholesalePrice),
          lowStockKg: String(product.lowStockKg),
        }
      : { name: "", categoryId: "", code: "", retailPrice: "", wholesalePrice: "", lowStockKg: "5" },
  });
  const { register, formState, control } = form;
  const errors = formState.errors;
  const [imageUrl, setImageUrl] = useState(product?.imageUrl);
  const watched = useWatch({ control });

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImageUrl(await fileToThumbnail(file));
    } catch {
      toast.error("That file could not be read as a picture. Try a JPG or PNG.");
    }
  };

  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) => {
        const saved = saveProduct({
          imageUrl,
          id: product?.id,
          name: data.name,
          categoryId: data.categoryId,
          code: data.code.toUpperCase(),
          retailPrice: toNumber(data.retailPrice),
          wholesalePrice: toNumber(data.wholesalePrice),
          lowStockKg: toNumber(data.lowStockKg),
        });
        const priceChanged =
          product && (product.retailPrice !== saved.retailPrice || product.wholesalePrice !== saved.wholesalePrice);
        toast.success(product ? (priceChanged ? "Price updated. The POS uses it from the next bill." : "Product updated") : "Product added");
        onDone();
      })}
    >
      <div className="flex items-center gap-3 rounded-lg border p-2.5">
        <ProductImage
          product={{ name: watched.name ?? "", code: watched.code, imageUrl }}
          category={categories.find((c) => c.id === watched.categoryId)}
          className="h-16 w-24 shrink-0 rounded-md"
        />
        <div className="grid gap-1.5">
          <p className="text-xs text-muted-foreground">
            {imageUrl ? "Your uploaded photo." : "Default picture for this product."} Shown in the POS.
          </p>
          <div className="flex flex-wrap gap-2">
            <label
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer focus-within:ring-3 focus-within:ring-ring/50",
              )}
            >
              <ImageUp /> {imageUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  void choosePhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {imageUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrl(undefined)}>
                Use default picture
              </Button>
            )}
          </div>
        </div>
      </div>
      <Field label="Product name" htmlFor="pr-name" error={errors.name?.message}>
        <Input id="pr-name" className="h-10" placeholder="e.g. Lollipop" {...register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" htmlFor="pr-category" error={errors.categoryId?.message}>
          <NativeSelect id="pr-category" className="h-10" {...register("categoryId")}>
            <option value="">Choose</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Short code" htmlFor="pr-code" error={errors.code?.message}>
          <Input id="pr-code" className="h-10 uppercase" placeholder="e.g. SLB-LP" {...register("code")} />
        </Field>
        <Field label="Retail price (₹/kg)" htmlFor="pr-retail" error={errors.retailPrice?.message}>
          <Input id="pr-retail" inputMode="decimal" className="h-10" {...register("retailPrice")} />
        </Field>
        <Field label="Wholesale price (₹/kg)" htmlFor="pr-wholesale" error={errors.wholesalePrice?.message}>
          <Input id="pr-wholesale" inputMode="decimal" className="h-10" {...register("wholesalePrice")} />
        </Field>
        <Field label="Low-stock level (kg)" htmlFor="pr-low" error={errors.lowStockKg?.message}>
          <Input id="pr-low" inputMode="decimal" className="h-10" {...register("lowStockKg")} />
        </Field>
      </div>
      <FormButtons onCancel={onDone} label="Save product" />
    </form>
  );
}

export function ProductsSettings() {
  const products = useStore((s) => s.products);
  const categories = useStore((s) => s.categories);
  const [categoryId, setCategoryId] = useState("all");
  const [editing, setEditing] = useState<{ product?: Product } | null>(null);
  const rows = products.filter((p) => categoryId === "all" || p.categoryId === categoryId);

  return (
    <Panel
      title="Products"
      description="Add products, edit them and change prices. Switch a product off to hide it from the POS."
      action={
        <Button onClick={() => setEditing({})}>
          <Plus /> Add product
        </Button>
      }
      bodyClassName="p-0"
    >
      <div className="border-b p-3">
        <FilterPills
          label="Category"
          value={categoryId}
          onChange={setCategoryId}
          options={[{ id: "all", label: "All" }, ...categories.map((c) => ({ id: c.id, label: c.code }))]}
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Code</TableHead>
            <TableHead className="text-right">Retail</TableHead>
            <TableHead className="text-right">Wholesale</TableHead>
            <TableHead className="text-right">Low level (kg)</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <ProductImage
                    product={p}
                    category={categories.find((c) => c.id === p.categoryId)}
                    className="h-9 w-[3.25rem] shrink-0 rounded-md"
                  />
                  <span>
                    {categories.find((c) => c.id === p.categoryId)?.code} - {p.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.code}</TableCell>
              <TableCell className="tabular text-right">{inr(p.retailPrice)}</TableCell>
              <TableCell className="tabular text-right">{inr(p.wholesalePrice)}</TableCell>
              <TableCell className="tabular text-right">{kgNum(p.lowStockKg)}</TableCell>
              <TableCell>
                <Switch
                  checked={p.active}
                  aria-label={`${p.name} active`}
                  onCheckedChange={(checked) => {
                    setProductActive(p.id, checked);
                    toast.success(`${p.name} ${checked ? "is back in" : "is hidden from"} the POS`);
                  }}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setEditing({ product: p })}>
                  <Pencil /> Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FormDialog
        open={!!editing}
        title={editing?.product ? "Edit product" : "Add product"}
        description="Prices are per kg."
        onClose={() => setEditing(null)}
      >
        <ProductForm product={editing?.product} onDone={() => setEditing(null)} />
      </FormDialog>
    </Panel>
  );
}

// ---------------------------------------------------------------- categories

const categorySchema = z.object({ code: requiredText("Code"), name: requiredText("Name") });
type CategoryValues = z.infer<typeof categorySchema>;

function CategoryForm({ category, onDone }: { category?: Category; onDone: () => void }) {
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? { code: category.code, name: category.name } : { code: "", name: "" },
  });
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) => {
        saveCategory({ id: category?.id, code: data.code.toUpperCase(), name: data.name });
        toast.success(category ? "Category updated" : "Category added");
        onDone();
      })}
    >
      <Field label="Code" htmlFor="cat-code" error={form.formState.errors.code?.message} hint="Printed before the product name on bills">
        <Input id="cat-code" className="h-10 uppercase" placeholder="e.g. FRZ" {...form.register("code")} />
      </Field>
      <Field label="Name" htmlFor="cat-name" error={form.formState.errors.name?.message}>
        <Input id="cat-name" className="h-10" placeholder="e.g. Frozen" {...form.register("name")} />
      </Field>
      <FormButtons onCancel={onDone} label="Save category" />
    </form>
  );
}

export function CategoriesSettings() {
  const categories = useStore((s) => s.categories);
  const products = useStore((s) => s.products);
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);

  return (
    <Panel
      title="Categories"
      description="The category code is shown and printed with every product."
      action={
        <Button onClick={() => setEditing({})}>
          <Plus /> Add category
        </Button>
      }
      bodyClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Products</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-semibold">{c.code}</TableCell>
              <TableCell>
                {c.name} {c.isLive && <Badge variant="outline">Live birds</Badge>}
              </TableCell>
              <TableCell className="tabular text-right">{products.filter((p) => p.categoryId === c.id).length}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setEditing({ category: c })}>
                  <Pencil /> Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FormDialog
        open={!!editing}
        title={editing?.category ? "Edit category" : "Add category"}
        description="Keep codes short so they fit on the bill."
        onClose={() => setEditing(null)}
      >
        <CategoryForm category={editing?.category} onDone={() => setEditing(null)} />
      </FormDialog>
    </Panel>
  );
}

// ---------------------------------------------------------------- users

const userSchema = z.object({
  name: requiredText("Name"),
  username: requiredText("Username"),
  role: z.enum(["owner", "manager", "cashier", "production"]),
  active: z.boolean(),
});
type UserValues = z.infer<typeof userSchema>;

function UserForm({ user, onDone }: { user?: User; onDone: () => void }) {
  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: user ?? { name: "", username: "", role: "cashier", active: true },
  });
  return (
    <form
      className="grid gap-3"
      noValidate
      onSubmit={form.handleSubmit((data) => {
        saveUser({ ...data, id: user?.id });
        toast.success(user ? "User updated" : "User added");
        onDone();
      })}
    >
      <Field label="Full name" htmlFor="us-name" error={form.formState.errors.name?.message}>
        <Input id="us-name" className="h-10" {...form.register("name")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Username" htmlFor="us-username" error={form.formState.errors.username?.message}>
          <Input id="us-username" className="h-10" autoCapitalize="none" {...form.register("username")} />
        </Field>
        <Field label="Role" htmlFor="us-role">
          <NativeSelect id="us-role" className="h-10" {...form.register("role")}>
            {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Controller
        control={form.control}
        name="active"
        render={({ field }) => (
          <label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium">
            Can sign in
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </label>
        )}
      />
      <FormButtons onCancel={onDone} label="Save user" />
    </form>
  );
}

export function UsersSettings() {
  const users = useStore((s) => s.users);
  const sessionId = useStore((s) => s.session?.id);
  const [editing, setEditing] = useState<{ user?: User } | null>(null);

  return (
    <Panel
      title="Users and roles"
      description="The role decides which menu items a person sees."
      action={
        <Button onClick={() => setEditing({})}>
          <Plus /> Add user
        </Button>
      }
      bodyClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                {u.name} {u.id === sessionId && <Badge variant="outline">You</Badge>}
              </TableCell>
              <TableCell className="text-muted-foreground">{u.username}</TableCell>
              <TableCell>{ROLE_LABELS[u.role]}</TableCell>
              <TableCell>
                <Badge variant={u.active ? "secondary" : "destructive"}>{u.active ? "Active" : "Disabled"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setEditing({ user: u })}>
                  <Pencil /> Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FormDialog
        open={!!editing}
        title={editing?.user ? "Edit user" : "Add user"}
        description="Demo: passwords are not checked."
        onClose={() => setEditing(null)}
      >
        <UserForm user={editing?.user} onDone={() => setEditing(null)} />
      </FormDialog>
    </Panel>
  );
}
