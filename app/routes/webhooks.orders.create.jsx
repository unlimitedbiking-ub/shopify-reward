import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    const { shop, session, topic, payload, admin } =
      await authenticate.webhook(request);

    console.log(`Received ${topic} webhook for ${shop}`);

    if (session) {
      let eliteReward = 0;
      let regularReward = 0;
      let customerType = "regular";

      if (
        payload?.customer?.tags?.some((tag) => tag?.toLowerCase() === "elite")
      ) {
        customerType = "elite";
      }
      for (const item of payload?.line_items || []) {
        const variantId = item?.variant_id;

        if (variantId) {
          const query = `
            {
              productVariant(id: "gid://shopify/ProductVariant/${variantId}") {
                id
                product {
                  id
                }
                metafields(namespace: "rewards", first: 10) {
                  edges {
                    node {
                      key
                      value
                    }
                  }
                }
              }
            }
          `;

          const response = await admin?.graphql(query);
          const data = await response?.json();

          const productId = data?.data?.productVariant?.product?.id
            ?.split("/")
            .pop();
          const metafields =
            data?.data?.productVariant?.metafields?.edges || [];

          const productExists = await prisma?.product?.findUnique({
            where: { id: productId },
          });

          if (!productExists) {
            console.log(
              `Product with ID ${productId} not found in the database. Skipping order.`,
            );
            return new Response(
              "Product not found in database, order not created",
              { status: 404 },
            );
          }

          metafields.forEach(({ node: { key, value } }) => {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
              if (key === "elite_reward") {
                eliteReward += numericValue;
              } else if (key === "regular_reward") {
                regularReward += numericValue;
              }
            }
          });
        }
      }

      const orderData = {
        id: payload?.id?.toString(),
        name: payload?.name,
        createdAt: new Date(payload?.created_at),
        updatedAt: new Date(payload?.updated_at),
        eliteReward,
        regularReward,
        customerType,
      };

      await prisma?.order?.upsert({
        where: { id: orderData?.id },
        update: {
          name: orderData?.name,
          createdAt: orderData?.createdAt,
          updatedAt: orderData?.updatedAt,
          eliteReward: orderData?.eliteReward,
          regularReward: orderData?.regularReward,
          customerType: orderData?.customerType,
        },
        create: orderData,
      });

      await fetch(
        "https://ubms-api-test.unlimitedbiking.com/ShopifyOrder/CreateReward",
        {
          method: "POST",
          headers: {
            accept: "/",
            "Content-Type": "application/json-patch+json",
            token: "Shpfy2024$!$",
          },
          body: JSON.stringify({
            orderid: payload?.id?.toString(),
            price:
              customerType == "elite"
                ? orderData?.eliteReward
                : orderData?.regularReward,
            currency:
              payload?.current_total_price_set?.shop_money?.currency_code,
          }),
        },
      )
        .then((response) => response.json())
        .then((data) => console.log("Reward API Response:", data))
        .catch((error) =>
          console.error("Error sending reward request:", error),
        );
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
};
