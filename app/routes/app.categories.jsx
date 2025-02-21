import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
import {
  Page,
  Card,
  TextField,
  Button,
  Layout,
  IndexTable,
  Modal,
  TextContainer,
  Spinner,
  Text,
} from "@shopify/polaris";
import shopify from "../shopify.server";
import {
  getAllCategories,
  updateCategory,
  createCategory,
} from "./api/categories";
import prisma from "../db.server";

export async function loader({ request }) {
  const categories = await getAllCategories();

  const orders = await prisma?.order?.findMany();

  return json({ categories, orders });
}

export const action = async ({ request }) => {
  const { admin, session } = await shopify?.authenticate?.admin(request);
  const formData = await request.formData();
  const intent = formData.get("_intent");

  try {
    if (intent === "delete") {
      const id = formData.get("id");

      const category = await prisma?.category?.findUnique({
        where: { id: id },
        include: {
          products: {
            include: { variants: true },
          },
        },
      });
      if (!category) {
        throw new Error("Category not found");
      }

      for (const product of category?.products) {
        for (const variant of product?.variants) {
          const variantMetafieldQuery = `
            mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                product {
                  id
                }
                productVariants {
                  id
                  metafields(first: 250) {
                    edges {
                      node {
                        namespace
                        key
                        value
                      }
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          const variables = {
            productId: `gid://shopify/Product/${product?.id}`,
            variants: [
              {
                id: `gid://shopify/ProductVariant/${variant?.id}`,
                metafields: [
                  {
                    namespace: "rewards",
                    key: "elite_reward",
                    value: "0",
                    type: "number_decimal",
                  },
                  {
                    namespace: "rewards",
                    key: "regular_reward",
                    value: "0",
                    type: "number_decimal",
                  },
                ],
              },
            ],
          };

          try {
            const metafieldResponse = await fetch(
              `https://${session.shop}/admin/api/2024-10/graphql.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "X-Shopify-Access-Token": `${session.accessToken}`,
                },
                body: JSON.stringify({
                  query: variantMetafieldQuery,
                  variables,
                }),
              },
            );

            if (!metafieldResponse.ok) {
              const errorDetails = await metafieldResponse.json();
              console.error("Error details:", errorDetails);
              throw new Error("Failed to update variant metafields");
            }

            const metafieldData = await metafieldResponse.json();
            console.log(
              `Metafields updated for variant ${variant.id}:`,
              metafieldData,
            );
          } catch (error) {
            console.error("Error updating variant metafields:", error);
          }
        }
      }

      for (const product of category?.products) {
        await prisma?.variant?.deleteMany({
          where: { productId: product?.id },
        });
      }

      await prisma?.product?.deleteMany({
        where: { collectionId: category?.collectionId },
      });

      await prisma?.category?.delete({
        where: { id: id },
      });
      console.log(category, "categorycategory");

      // await deleteCategory(id);

      return json({ success: "Category deleted successfully!" });
    }

    if (intent === "update") {
      const id = formData.get("id");
      const name = formData.get("name");
      const eliteGrossMargin = parseFloat(formData.get("eliteGrossMargin"));
      const regularGrossMargin = parseFloat(formData.get("regularGrossMargin"));

      const query = `
      {
        collections(first: 250) {
          edges {
            node {
              id
              title
              descriptionHtml
              updatedAt
              handle
              image {
                src
              }
            }
          }
        }
      }
    `;

      const response = await admin?.graphql(query);
      const data = await response?.json();
      const collections = data?.data?.collections?.edges || [];

      const collectionData = collections?.map(({ node }) => {
        const collectionId = node?.id.split("/").pop();
        return {
          collectionId,
          title: node?.title,
          descriptionHtml: node?.descriptionHtml,
          updatedAt: node?.updatedAt,
          handle: node?.handle,
          imageSrc: node?.image?.src || null,
        };
      });

      const matchingCollection = collectionData?.find(
        (collection) =>
          collection?.title?.toLowerCase() === name?.toLowerCase(),
      );

      if (matchingCollection) {
        await updateCategory(id, {
          name,
          eliteGrossMargin,
          regularGrossMargin,
          collectionId: matchingCollection?.collectionId || null,
        });
      } else {
        const category = await prisma?.category?.findUnique({
          where: { id: id },
          include: {
            products: {
              include: { variants: true },
            },
          },
        });
        if (!category) {
          throw new Error("Category not found");
        }

        for (const product of category?.products) {
          for (const variant of product?.variants) {
            const variantMetafieldQuery = `
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  product {
                    id
                  }
                  productVariants {
                    id
                    metafields(first: 250) {
                      edges {
                        node {
                          namespace
                          key
                          value
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;

            const variables = {
              productId: `gid://shopify/Product/${product?.id}`,
              variants: [
                {
                  id: `gid://shopify/ProductVariant/${variant?.id}`,
                  metafields: [
                    {
                      namespace: "rewards",
                      key: "elite_reward",
                      value: "0",
                      type: "number_decimal",
                    },
                    {
                      namespace: "rewards",
                      key: "regular_reward",
                      value: "0",
                      type: "number_decimal",
                    },
                  ],
                },
              ],
            };

            try {
              const metafieldResponse = await fetch(
                `https://${session.shop}/admin/api/2024-10/graphql.json`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": `${session.accessToken}`,
                  },
                  body: JSON.stringify({
                    query: variantMetafieldQuery,
                    variables,
                  }),
                },
              );

              if (!metafieldResponse.ok) {
                const errorDetails = await metafieldResponse.json();
                console.error("Error details:", errorDetails);
                throw new Error("Failed to update variant metafields");
              }

              const metafieldData = await metafieldResponse.json();
              console.log(
                `Metafields updated for variant ${variant?.id}:`,
                metafieldData,
              );
            } catch (error) {
              console.error("Error updating variant metafields:", error);
            }
          }
        }

        for (const product of category?.products) {
          await prisma?.variant?.deleteMany({
            where: { productId: product?.id },
          });
        }

        await prisma?.product?.deleteMany({
          where: { collectionId: category?.collectionId },
        });
        await updateCategory(id, {
          name,
          eliteGrossMargin,
          regularGrossMargin,
          collectionId: matchingCollection?.collectionId || null,
        });
      }

      return json({ success: "Category updated successfully!" });
    }

    if (intent === "create") {
      const name = formData.get("name");
      const eliteGrossMargin = parseFloat(formData.get("eliteGrossMargin"));
      const regularGrossMargin = parseFloat(formData.get("regularGrossMargin"));

      const query = `
      {
        collections(first: 250) {
          edges {
            node {
              id
              title
              descriptionHtml
              updatedAt
              handle
              image {
                src
              }
            }
          }
        }
      }
    `;

      const response = await admin?.graphql(query);
      const data = await response?.json();
      const collections = data?.data?.collections?.edges || [];

      const collectionData = collections?.map(({ node }) => {
        const collectionId = node?.id.split("/").pop();
        return {
          collectionId,
          title: node?.title,
          descriptionHtml: node?.descriptionHtml,
          updatedAt: node?.updatedAt,
          handle: node?.handle,
          imageSrc: node?.image?.src || null,
        };
      });

      await Promise.all(
        collectionData.map(async (collection) => {
          const category = await prisma?.category?.findUnique({
            where: { name: collection?.title },
          });

          if (category && !category.collectionId) {
            await prisma?.category?.update({
              where: { id: category?.id },
              data: { collectionId: collection?.collectionId },
            });
          }
        }),
      );

      const matchingCollection = collectionData?.find(
        (collection) =>
          collection?.title?.toLowerCase() === name?.toLowerCase(),
      );

      const category = await createCategory({
        name,
        eliteGrossMargin,
        regularGrossMargin,
        collectionId: matchingCollection?.collectionId || null,
      });

      return json({
        success: `Category "${category?.name}" added successfully!`,
      });
    }
    if (intent === "syncProduct") {
      const ids = formData.get("ids")?.split(",") || [];

      for (const collectionId of ids) {
        const query = `
          {
            collection(id: "gid://shopify/Collection/${collectionId}") {
              id
              title
              handle
              products (first: 100) {
                edges {
                  node {
                    id
                    title
                    handle
                  }
                }
              }
            }
          }
        `;

        try {
          const response = await admin?.graphql(query);
          const data = await response?.json();

          const products = data?.data?.collection?.products?.edges || [];

          for (const productEdge of products) {
            const product = productEdge?.node;
            const productId = productEdge?.node?.id.split("/").pop();
            const colleId = data?.data?.collection?.id.split("/").pop();

            const collection = await prisma?.category?.findUnique({
              where: { collectionId: colleId },
            });

            const eliteGrossMargin = collection?.eliteGrossMargin || 0;
            const regularGrossMargin = collection?.regularGrossMargin || 0;

            const existingProduct = await prisma?.product?.findUnique({
              where: { id: productId },
            });

            if (!existingProduct) {
              await prisma?.product?.create({
                data: {
                  id: productId,
                  title: product?.title,
                  collectionId: colleId,
                },
              });
            }

            const variantQuery = `
              {
                node(id: "${productEdge?.node?.id}") {
                  ... on Product {
                    variants(first: 250) {
                      nodes {
                        id
                        price
                        inventoryItem {
                          unitCost {
                            amount
                          }
                        }
                      }
                    }
                  }
                }
              }
            `;

            const response1 = await admin?.graphql(variantQuery);
            const dataProducts = await response1?.json();
            const allVariants = dataProducts?.data?.node?.variants?.nodes;

            for (const variant of allVariants) {
              const variantId = variant?.id.split("/").pop();

              const salePrice = parseFloat(variant?.price) || 0;
              const costPrice =
                parseFloat(variant?.inventoryItem?.unitCost?.amount) || 0;
              const margin = ((salePrice - costPrice) / salePrice) * 100;

              const eliteReward = (margin * eliteGrossMargin) / 100;
              const regularReward = (margin * regularGrossMargin) / 100;

              const eliteRewardDecimal = parseFloat(eliteReward?.toFixed(2));
              const regularRewardDecimal = parseFloat(
                regularReward?.toFixed(2),
              );
              const existingVariant = await prisma?.variant?.findUnique({
                where: { id: variantId },
              });

              if (!existingVariant) {
                await prisma?.variant?.create({
                  data: {
                    id: variantId,
                    productId: productId,
                    price: salePrice,
                    unitCost: costPrice,
                    eliteReward: eliteRewardDecimal,
                    regularReward: regularRewardDecimal,
                  },
                });
              }

              const variantMetafieldQuery = `
              mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                  product {
                    id
                  }
                  productVariants {
                    id
                    metafields(first: 250) {
                      edges {
                        node {
                          namespace
                          key
                          value
                        }
                      }
                    }
                  }
                  userErrors {
                    field
                    message
                  }
                }
              }
            `;

              const variables = {
                productId: `gid://shopify/Product/${productId}`,
                variants: [
                  {
                    id: `gid://shopify/ProductVariant/${variantId}`,
                    metafields: [
                      {
                        namespace: "rewards",
                        key: "elite_reward",
                        value: `${eliteRewardDecimal}`,
                        type: "number_decimal",
                      },
                      {
                        namespace: "rewards",
                        key: "regular_reward",
                        value: `${regularRewardDecimal}`,
                        type: "number_decimal",
                      },
                    ],
                  },
                ],
              };

              try {
                const metafieldResponse = await fetch(
                  `https://${session?.shop}/admin/api/2024-10/graphql.json`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Shopify-Access-Token": `${session?.accessToken}`,
                    },
                    body: JSON.stringify({
                      query: variantMetafieldQuery,
                      variables: variables,
                    }),
                  },
                );

                if (!metafieldResponse.ok) {
                  const errorDetails = await metafieldResponse.json();
                  console.error("Error details:", errorDetails);
                  throw new Error("Failed to update variant metafields");
                }

                const metafieldData = await metafieldResponse.json();
                console.log("Variant metafields updated:", metafieldData);
              } catch (error) {
                console.error("Error updating variant metafields:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error processing products and variants:", error);
        }
      }

      return json({
        success: `Products synced successfully!`,
      });
    }
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
};

export default function Categories() {
  const { categories, orders } = useLoaderData();

  const fetcher = useFetcher();
  const [form, setForm] = useState({
    name: "",
    eliteGrossMargin: "",
    regularGrossMargin: "",
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [addCategoryModel, setAddCategoryModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorUpdate, setErrorUpdate] = useState("");
  const [isLoading, setIsLoading] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [categories]);
  useEffect(() => {
    setLoadingCustomer(false);
  }, [orders]);

  const syncProducts = () => {
    setIsLoading("syncProducts");
    let ids = [];
    categories?.map((item) => ids?.push(item?.collectionId));
    fetcher.submit({ ids, _intent: "syncProduct" }, { method: "POST" });
  };

  const handleSubmit = () => {
    const { eliteGrossMargin, name, regularGrossMargin } = form;
    if (!eliteGrossMargin || !name || !regularGrossMargin) {
      setError("All fields are required!");
    } else {
      setError("");
      setLoading(true);
      fetcher.submit({ ...form, _intent: "create" }, { method: "POST" });
      setForm({ name: "", eliteGrossMargin: "", regularGrossMargin: "" });
      setAddCategoryModel(false);
    }
  };

  const handleDelete = (id) => {
    setError("");
    setLoading(true);
    fetcher.submit({ id, _intent: "delete" }, { method: "POST" });
  };

  useEffect(() => {
    if (fetcher.state === "idle") {
      setIsLoading(null);
    }
  }, [fetcher.state]);

  const isSyncProducts =
    isLoading === "syncProducts" && fetcher.state !== "idle";

  const handleUpdate = () => {
    const { eliteGrossMargin, name, regularGrossMargin } = selectedCategory;
    if (!eliteGrossMargin || !name || !regularGrossMargin) {
      setErrorUpdate("All fields are required!");
    } else {
      setLoading(true);
      setErrorUpdate("");
      fetcher.submit(
        { ...selectedCategory, _intent: "update" },
        { method: "POST" },
      );
      setShowModal(false);
      setSelectedCategory(null);
    }
  };

  return (
    <Page fullWidth title="Categories">
      <Layout>
        {addCategoryModel && (
          <Modal
            open={addCategoryModel}
            onClose={() => {
              setAddCategoryModel(false);
              setError("");
            }}
            title="Create Category"
            primaryAction={{
              content: "Create",
              onAction: handleSubmit,
            }}
          >
            <Modal.Section>
              <TextContainer>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(value) => setForm({ ...form, name: value })}
                />
                <div style={{ marginTop: "10px" }}>
                  <TextField
                    label="Elite Gross Margin"
                    type="number"
                    value={form.eliteGrossMargin}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        eliteGrossMargin: parseFloat(value),
                      })
                    }
                  />
                </div>
                <div style={{ marginTop: "10px" }}>
                  <TextField
                    label="Regular Gross Margin"
                    type="number"
                    value={form.regularGrossMargin}
                    onChange={(value) =>
                      setForm({
                        ...form,
                        regularGrossMargin: parseFloat(value),
                      })
                    }
                  />
                </div>
                {error && (
                  <div
                    style={{
                      color: "red",
                      marginTop: "10px",
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </div>
                )}
              </TextContainer>
            </Modal.Section>
          </Modal>
        )}
        <Layout.Section>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spinner accessibilityLabel="Loading" size="small" />
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "end",
                  alignItems: "center",
                  marginBottom: 15,
                  gap: 10,
                }}
              >
                <Button
                  onClick={() => {
                    setAddCategoryModel(true);
                    setErrorUpdate("");
                  }}
                  variant="primary"
                  disabled={isSyncProducts}
                >
                  Add Category
                </Button>
                <Button
                  disabled={categories?.length === 0}
                  onClick={syncProducts}
                  variant="primary"
                  loading={isSyncProducts}
                >
                  Sync Products
                </Button>
              </div>
              <Card title="Categories List" sectioned>
                <IndexTable
                  resourceName={{ singular: "category", plural: "categories" }}
                  itemCount={categories?.length || 0}
                  headings={[
                    { title: "Name" },
                    { title: "Elite Gross Margin" },
                    { title: "Regular Gross Margin" },
                    { title: "Actions" },
                  ]}
                  selectable={false}
                >
                  {categories?.map((category) => (
                    <IndexTable.Row id={category.id} key={category.id}>
                      <IndexTable.Cell>{category.name}</IndexTable.Cell>
                      <IndexTable.Cell>
                        {category.eliteGrossMargin}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        {category.regularGrossMargin}
                      </IndexTable.Cell>
                      <IndexTable.Cell>
                        <div style={{ display: "flex", gap: 10 }}>
                          <Button
                            onClick={() => {
                              setSelectedCategory(category);
                              setShowModal(true);
                              setError("");
                            }}
                          >
                            Update
                          </Button>
                          <Button
                            destructive
                            onClick={() => handleDelete(category.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Card>
            </div>
          )}
        </Layout.Section>
        <Layout.Section>
          <div style={{ marginBottom: "10px" }}>
            <Text variant="bodyMd" fontWeight="bold">
              Orders:
            </Text>
          </div>
          {loadingCustomer ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spinner accessibilityLabel="Loading" size="small" />
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}>
              <Card title="Orders">
                <IndexTable
                  resourceName={{ singular: "order", plural: "orders" }}
                  itemCount={orders?.length || 0}
                  headings={[
                    { title: "Id" },
                    { title: "Name" },
                    { title: "Customer Type" },
                    { title: "Reward" },
                  ]}
                  selectable={false}
                >
                  {orders?.map((order) => (
                    <IndexTable.Row id={order?.id} key={order?.id}>
                      <IndexTable.Cell>{order?.id}</IndexTable.Cell>
                      <IndexTable.Cell>{order?.name}</IndexTable.Cell>
                      <IndexTable.Cell>{order?.customerType}</IndexTable.Cell>
                      <IndexTable.Cell>
                        {order?.customerType === "elite"
                          ? order?.eliteReward
                          : order?.regularReward}
                      </IndexTable.Cell>
                    </IndexTable.Row>
                  ))}
                </IndexTable>
              </Card>
            </div>
          )}
        </Layout.Section>
      </Layout>

      {showModal && (
        <Modal
          open={showModal}
          onClose={() => {
            setShowModal(false);
            setErrorUpdate("");
          }}
          title="Update Category"
          primaryAction={{
            content: "Update",
            onAction: handleUpdate,
          }}
        >
          <Modal.Section>
            <TextContainer>
              <TextField
                label="Name"
                value={selectedCategory?.name || ""}
                onChange={(value) =>
                  setSelectedCategory({ ...selectedCategory, name: value })
                }
              />
              <TextField
                label="Elite Gross Margin"
                type="number"
                value={selectedCategory?.eliteGrossMargin || ""}
                onChange={(value) =>
                  setSelectedCategory({
                    ...selectedCategory,
                    eliteGrossMargin: parseFloat(value),
                  })
                }
              />
              <TextField
                label="Regular Gross Margin"
                type="number"
                value={selectedCategory?.regularGrossMargin || ""}
                onChange={(value) =>
                  setSelectedCategory({
                    ...selectedCategory,
                    regularGrossMargin: parseFloat(value),
                  })
                }
              />
              {errorUpdate && (
                <div
                  style={{
                    color: "red",
                    marginTop: "10px",
                    textAlign: "center",
                  }}
                >
                  {errorUpdate}
                </div>
              )}
            </TextContainer>
          </Modal.Section>
        </Modal>
      )}
    </Page>
  );
}
