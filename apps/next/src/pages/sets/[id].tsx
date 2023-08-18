import dynamic from "next/dynamic";

import { getServerAuthSession } from "@quenti/auth";
import { HeadSeo } from "@quenti/components";
import { prisma } from "@quenti/prisma";
import type { GetServerSidePropsContext } from "@quenti/types";

import { PageWrapper } from "../../common/page-wrapper";
import { getLayout } from "../../layouts/main-layout";
import type { inferSSRProps } from "../../lib/infer-ssr-props";
import { HydrateSetData } from "../../modules/hydrate-set-data";
import { Set404 } from "../../modules/main/set-404";
import SetLoading from "../../modules/main/set-loading";
import { SetPrivate } from "../../modules/main/set-private";

const InternalSet = dynamic(() => import("../../components/internal-set"), {
  ssr: false,
  loading: SetLoading,
});

const Set = ({ set, isPrivate }: inferSSRProps<typeof getServerSideProps>) => {
  if (isPrivate) return <SetPrivate />;
  if (!set) return <Set404 />;

  return (
    <>
      <HeadSeo
        title={set?.title ?? "Not found"}
        description={set?.description ?? undefined}
        entity={{
          type: "StudySet",
          title: set.title,
          description: set.description,
          numItems: set._count.terms,
          user: {
            username: set.user.username,
            image: set.user.image || "",
          },
        }}
      />
      <HydrateSetData placeholder={<SetLoading />}>
        <InternalSet />
      </HydrateSetData>
    </>
  );
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const session = await getServerAuthSession(ctx);
  const userId = session?.user?.id;

  const set = await prisma.studySet.findUnique({
    where: {
      id: ctx.query?.id as string,
    },
    select: {
      id: true,
      title: true,
      description: true,
      visibility: true,
      user: {
        select: {
          id: true,
          username: true,
          image: true,
        },
      },
      _count: {
        select: {
          terms: true,
        },
      },
    },
  });

  if (!set) return { props: { set: null } };
  if (set.visibility == "Private" && set.user.id != userId)
    return { props: { set: null, isPrivate: true } };

  return {
    props: {
      set,
    },
  };
};

Set.PageWrapper = PageWrapper;
Set.getLayout = getLayout;

export default Set;
