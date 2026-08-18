import "./skeleton.css";

interface SkeletonBoneProps {
  width?: string;
  height?: string;
  radius?: string;
}

export function SkeletonBone({
  width = "100%",
  height = "0.875rem",
  radius = "4px",
}: SkeletonBoneProps) {
  return (
    <div
      className="cm-bone"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius }}
    />
  );
}

function SkeletonField() {
  return (
    <s-stack direction="block" gap="small-200">
      <SkeletonBone width="30%" height="0.75rem" />
      <SkeletonBone height="2rem" radius="8px" />
    </s-stack>
  );
}

function SkeletonChoiceRow({ width = "40%" }: { width?: string }) {
  return (
    <s-stack direction="inline" gap="small-200" alignItems="center">
      <SkeletonBone width="18px" height="18px" radius="9px" />
      <SkeletonBone width={width} />
    </s-stack>
  );
}

export function HomeSkeleton() {
  return (
    <s-section>
      <div role="status" aria-label="Loading settings">
        <s-stack direction="block" gap="large">
          <s-stack direction="inline" gap="base" alignItems="center">
            <SkeletonBone width="20px" height="20px" radius="10px" />
            <SkeletonBone width="30%" height="1rem" />
            <SkeletonBone width="48px" height="20px" radius="10px" />
            <SkeletonBone width="36px" height="20px" radius="10px" />
          </s-stack>
          <s-grid gridTemplateColumns="1fr 1fr 1fr" gap="base">
            {[0, 1, 2].map((i) => (
              <s-box
                key={i}
                padding="base"
                borderWidth="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="small-300">
                  <SkeletonBone width="40%" height="0.75rem" />
                  <SkeletonBone width="60%" height="1rem" />
                  <SkeletonBone width="80%" height="0.75rem" />
                </s-stack>
              </s-box>
            ))}
          </s-grid>
        </s-stack>
      </div>
    </s-section>
  );
}

export function AppearanceSkeleton() {
  return (
    <s-section>
      <div role="status" aria-label="Loading settings">
        <s-stack direction="block" gap="base">
          <SkeletonBone width="20%" height="1rem" />
          <SkeletonChoiceRow width="50%" />
          <s-grid gridTemplateColumns="1fr 1fr" gap="base">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
            <SkeletonField />
          </s-grid>
          <SkeletonField />
          <SkeletonBone height="120px" radius="8px" />
        </s-stack>
      </div>
    </s-section>
  );
}

export function TargetingSkeleton() {
  return (
    <s-section>
      <div role="status" aria-label="Loading settings">
        <s-stack direction="block" gap="base">
          <SkeletonBone width="30%" height="1rem" />
          <SkeletonChoiceRow width="45%" />
          <SkeletonChoiceRow width="30%" />
          <SkeletonChoiceRow width="55%" />
          <SkeletonBone width="60%" height="0.75rem" />
        </s-stack>
      </div>
    </s-section>
  );
}

export function ContentSkeleton() {
  return (
    <>
      <s-section>
        <div role="status" aria-label="Loading settings">
          <s-stack direction="block" gap="base">
            <SkeletonBone width="15%" height="1rem" />
            <SkeletonField />
            <s-grid gridTemplateColumns="1fr 1fr" gap="base">
              <SkeletonField />
              <SkeletonField />
            </s-grid>
            <SkeletonField />
            <SkeletonField />
            <SkeletonChoiceRow width="50%" />
          </s-stack>
        </div>
      </s-section>
      <s-section>
        <s-stack direction="block" gap="base">
          <SkeletonBone width="25%" height="1rem" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonBone height="120px" radius="8px" />
        </s-stack>
      </s-section>
    </>
  );
}

export function SettingsLoadError() {
  return (
    <s-banner heading="Couldn't load your settings" tone="critical">
      <s-paragraph>
        Please reload the page. If this keeps happening, reinstall the app or
        contact support.
      </s-paragraph>
    </s-banner>
  );
}
