import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  // try {
  //   const { shop, session, topic, payload, admin } =
  //     await authenticate.webhook(request);

  //   console.log(`Received ${topic} webhook for ${shop}`);

  //   if (session) {
  //     const productId = payload?.id;

  //     const query = `
  //       {
  //         product(id: "gid://shopify/Product/${productId}") {
  //           collections(first: 10) {
  //             edges {
  //               node {
  //                 id
  //                 title
  //                 handle
  //               }
  //             }
  //           }
  //         }
  //       }
  //     `;

  //     const response = await admin?.graphql(query);
  //     const data = await response?.json();

  //     const collections = data?.data?.product?.collections?.edges || [];

  //     // if (collections?.length > 0) {
  //     //   for (const collectionEdge of collections) {
  //     //     const collection = collectionEdge?.node;
  //     //     const collectionId = collection?.id?.split("/").pop();

  //     //     const existingCategory = await prisma?.category?.findUnique({
  //     //       where: { collectionId: collectionId },
  //     //     });

  //     //     if (existingCategory) {
  //     //       const eliteGrossMargin = existingCategory?.eliteGrossMargin || 0;
  //     //       const regularGrossMargin =
  //     //         existingCategory?.regularGrossMargin || 0;

  //     //       const productData = {
  //     //         title: payload?.title,
  //     //         collectionId: collectionId,
  //     //       };

  //     //       await prisma?.product?.upsert({
  //     //         where: { id: payload?.id?.toString() },
  //     //         update: productData,
  //     //         create: { ...productData, id: payload?.id?.toString() },
  //     //       });

  //     //       const variants = payload?.variants || [];

  //     //       for (const variant of variants) {
  //     //         const inventoryItemId = variant?.inventory_item_id;

  //     //         const inventoryQuery = `
  //     //           {
  //     //             inventoryItem(id: "gid://shopify/InventoryItem/${inventoryItemId}") {
  //     //               unitCost {
  //     //                 amount
  //     //               }
  //     //             }
  //     //           }
  //     //         `;

  //     //         const inventoryResponse = await admin?.graphql(inventoryQuery);
  //     //         const inventoryData = await inventoryResponse?.json();

  //     //         const salePrice = parseFloat(variant?.price) || 0;
  //     //         const costPrice =
  //     //           parseFloat(
  //     //             inventoryData?.data?.inventoryItem?.unitCost?.amount,
  //     //           ) || 0;
  //     //         const margin = ((salePrice - costPrice) / salePrice) * 100;

  //     //         const eliteReward = (margin * eliteGrossMargin) / 100;
  //     //         const regularReward = (margin * regularGrossMargin) / 100;

  //     //         const eliteRewardDecimal = parseFloat(eliteReward?.toFixed(2));
  //     //         const regularRewardDecimal = parseFloat(
  //     //           regularReward?.toFixed(2),
  //     //         );

  //     //         const variantData = {
  //     //           id: variant?.id?.toString(),
  //     //           price: salePrice,
  //     //           unitCost: costPrice,
  //     //           productId: payload?.id?.toString(),
  //     //           eliteReward: eliteRewardDecimal,
  //     //           regularReward: regularRewardDecimal,
  //     //         };

  //     //         const existingVariant = await prisma?.variant?.findUnique({
  //     //           where: { id: variant?.id?.toString() },
  //     //         });

  //     //         const isVariantChanged =
  //     //           existingVariant?.price !== salePrice ||
  //     //           existingVariant?.unitCost !== costPrice;

  //     //         if (isVariantChanged) {
  //     //           try {
  //     //             await prisma?.variant?.upsert({
  //     //               where: { id: variant?.id?.toString() },
  //     //               update: variantData,
  //     //               create: variantData,
  //     //             });
  //     //           } catch (error) {
  //     //             console.error("Error updating variant:", error);
  //     //           }

  //     //           const variantMetafieldQuery = `
  //     //             mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  //     //               productVariantsBulkUpdate(productId: $productId, variants: $variants) {
  //     //                 product {
  //     //                   id
  //     //                 }
  //     //                 productVariants {
  //     //                   id
  //     //                   metafields(first: 100) {
  //     //                     edges {
  //     //                       node {
  //     //                         namespace
  //     //                         key
  //     //                         value
  //     //                       }
  //     //                     }
  //     //                   }
  //     //                 }
  //     //                 userErrors {
  //     //                   field
  //     //                   message
  //     //                 }
  //     //               }
  //     //             }
  //     //           `;

  //     //           const variables = {
  //     //             productId: `gid://shopify/Product/${productId}`,
  //     //             variants: [
  //     //               {
  //     //                 id: `gid://shopify/ProductVariant/${variant?.id?.toString()}`,
  //     //                 metafields: [
  //     //                   {
  //     //                     namespace: "rewards",
  //     //                     key: "elite_reward",
  //     //                     value: `${eliteRewardDecimal}`,
  //     //                     type: "number_decimal",
  //     //                   },
  //     //                   {
  //     //                     namespace: "rewards",
  //     //                     key: "regular_reward",
  //     //                     value: `${regularRewardDecimal}`,
  //     //                     type: "number_decimal",
  //     //                   },
  //     //                 ],
  //     //               },
  //     //             ],
  //     //           };

  //     //           try {
  //     //             const metafieldResponse = await fetch(
  //     //               `https://${session?.shop}/admin/api/2024-10/graphql.json`,
  //     //               {
  //     //                 method: "POST",
  //     //                 headers: {
  //     //                   "Content-Type": "application/json",
  //     //                   "X-Shopify-Access-Token": `${session?.accessToken}`,
  //     //                 },
  //     //                 body: JSON.stringify({
  //     //                   query: variantMetafieldQuery,
  //     //                   variables: variables,
  //     //                 }),
  //     //               },
  //     //             );

  //     //             if (!metafieldResponse.ok) {
  //     //               const errorDetails = await metafieldResponse.json();
  //     //               console.error("Error details:", errorDetails);
  //     //               throw new Error("Failed to update variant metafields");
  //     //             }
  //     //           } catch (error) {
  //     //             console.error("Error updating variant metafields:", error);
  //     //           }
  //     //         }
  //     //       }
  //     //     } else {
  //     //       const productId = payload?.id?.toString();
  //     //       if (productId) {
  //     //         const productVariants = await prisma?.variant?.findMany({
  //     //           where: { productId: productId },
  //     //         });

  //     //         const variantMetafieldQuery = `
  //     //             mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  //     //               productVariantsBulkUpdate(productId: $productId, variants: $variants) {
  //     //                 product {
  //     //                   id
  //     //                 }
  //     //                 productVariants {
  //     //                   id
  //     //                   metafields(first: 100) {
  //     //                     edges {
  //     //                       node {
  //     //                         namespace
  //     //                         key
  //     //                         value
  //     //                       }
  //     //                     }
  //     //                   }
  //     //                 }
  //     //                 userErrors {
  //     //                   field
  //     //                   message
  //     //                 }
  //     //               }
  //     //             }
  //     //           `;

  //     //         const variables = {
  //     //           productId: `gid://shopify/Product/${productId}`,
  //     //           variants: productVariants.map((variant) => ({
  //     //             id: `gid://shopify/ProductVariant/${variant.id}`,
  //     //             metafields: [
  //     //               {
  //     //                 namespace: "rewards",
  //     //                 key: "elite_reward",
  //     //                 value: "0",
  //     //                 type: "number_decimal",
  //     //               },
  //     //               {
  //     //                 namespace: "rewards",
  //     //                 key: "regular_reward",
  //     //                 value: "0",
  //     //                 type: "number_decimal",
  //     //               },
  //     //             ],
  //     //           })),
  //     //         };

  //     //         try {
  //     //           const metafieldResponse = await fetch(
  //     //             `https://${session?.shop}/admin/api/2024-10/graphql.json`,
  //     //             {
  //     //               method: "POST",
  //     //               headers: {
  //     //                 "Content-Type": "application/json",
  //     //                 "X-Shopify-Access-Token": `${session?.accessToken}`,
  //     //               },
  //     //               body: JSON.stringify({
  //     //                 query: variantMetafieldQuery,
  //     //                 variables: variables,
  //     //               }),
  //     //             },
  //     //           );

  //     //           if (!metafieldResponse.ok) {
  //     //             const errorDetails = await metafieldResponse.json();
  //     //             console.error("Error details:", errorDetails);
  //     //             throw new Error("Failed to update variant metafields");
  //     //           }

  //     //           const metafieldData = await metafieldResponse.json();
  //     //         } catch (error) {
  //     //           console.error("Error updating variant metafields:", error);
  //     //         }

  //     //         try {
  //     //           await prisma?.variant?.deleteMany({
  //     //             where: { productId: productId },
  //     //           });

  //     //           const existingProduct = await prisma?.product?.findUnique({
  //     //             where: { id: productId },
  //     //           });

  //     //           if (existingProduct) {
  //     //             await prisma?.product?.delete({
  //     //               where: { id: productId },
  //     //             });
  //     //           }
  //     //         } catch (error) {
  //     //           console.error("Error during deletion:", error);
  //     //         }
  //     //       }
  //     //     }
  //     //   }
  //     // }
  //   }

  //   return new Response("Webhook handled successfully", { status: 200 });
  // } catch (error) {
  //   console.error("Error handling product update webhook:", error);
  //   return new Response("Error processing webhook", { status: 500 });
  // }
};
