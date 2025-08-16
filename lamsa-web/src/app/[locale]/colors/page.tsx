'use client';

export default function ColorsTestPage() {
  return (
    <div className="min-h-screen bg-lamsa-background p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-lamsa-primary mb-4">
            Lamsa Brand Colors & Components
          </h1>
          <p className="text-text-secondary text-lg">
            Testing all brand colors, utilities, and component styles
          </p>
        </div>

        {/* Brand Colors */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Brand Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-primary rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-text-tertiary">#4A3643</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-secondary rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Secondary</p>
              <p className="text-xs text-text-tertiary">#CC8899</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-tertiary rounded-lg mb-2"></div>
              <p className="text-sm font-medium">Tertiary</p>
              <p className="text-xs text-text-tertiary">#D4A5A5</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-surface rounded-lg mb-2 border"></div>
              <p className="text-sm font-medium">Surface</p>
              <p className="text-xs text-text-tertiary">#F5E6E6</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-background rounded-lg mb-2 border"></div>
              <p className="text-sm font-medium">Background</p>
              <p className="text-xs text-text-tertiary">#FAF7F6</p>
            </div>
          </div>
        </section>

        {/* Interactive States */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Interactive States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-primary hover:bg-lamsa-primary-hover active:bg-lamsa-primary-active rounded-lg mb-2 transition-colors cursor-pointer"></div>
              <p className="text-sm font-medium">Primary States</p>
              <p className="text-xs text-text-tertiary">Hover over to see states</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-secondary hover:bg-lamsa-secondary-hover active:bg-lamsa-secondary-active rounded-lg mb-2 transition-colors cursor-pointer"></div>
              <p className="text-sm font-medium">Secondary States</p>
              <p className="text-xs text-text-tertiary">Hover over to see states</p>
            </div>
            <div className="text-center">
              <div className="w-full h-20 bg-lamsa-tertiary hover:bg-lamsa-tertiary-hover active:bg-lamsa-tertiary-active rounded-lg mb-2 transition-colors cursor-pointer"></div>
              <p className="text-sm font-medium">Tertiary States</p>
              <p className="text-xs text-text-tertiary">Hover over to see states</p>
            </div>
          </div>
        </section>

        {/* Button Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Button Components</h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn-lamsa-primary">Primary Button</button>
            <button className="btn-lamsa-secondary">Secondary Button</button>
            <button className="btn-lamsa-outline">Outline Button</button>
            <button className="btn-lamsa-ghost">Ghost Button</button>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="btn-lamsa-primary btn-sm">Small</button>
            <button className="btn-lamsa-primary">Default</button>
            <button className="btn-lamsa-primary btn-lg">Large</button>
            <button className="btn-lamsa-primary btn-xl">Extra Large</button>
          </div>
        </section>

        {/* Card Components */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Card Components</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card-lamsa-white">
              <div className="card-header">
                <h3 className="font-semibold">White Card</h3>
              </div>
              <div className="card-content">
                <p className="text-text-secondary">Standard white background card with shadow.</p>
              </div>
            </div>
            <div className="card-lamsa-surface">
              <div className="card-header">
                <h3 className="font-semibold">Surface Card</h3>
              </div>
              <div className="card-content">
                <p className="text-text-secondary">Cream blush surface background card.</p>
              </div>
            </div>
            <div className="card-lamsa-primary">
              <div className="card-header">
                <h3 className="font-semibold">Primary Card</h3>
              </div>
              <div className="card-content">
                <p className="text-white/80">Primary colored card with white text.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Status Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Status Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-success">
              <div className="card-content">
                <h3 className="font-semibold mb-2">Success</h3>
                <p className="text-sm">Operation completed successfully.</p>
              </div>
            </div>
            <div className="card-warning">
              <div className="card-content">
                <h3 className="font-semibold mb-2">Warning</h3>
                <p className="text-sm">Please review this information.</p>
              </div>
            </div>
            <div className="card-error">
              <div className="card-content">
                <h3 className="font-semibold mb-2">Error</h3>
                <p className="text-sm">Something went wrong.</p>
              </div>
            </div>
            <div className="card-info">
              <div className="card-content">
                <h3 className="font-semibold mb-2">Info</h3>
                <p className="text-sm">Additional information available.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Badge Components</h2>
          <div className="flex flex-wrap gap-3">
            <span className="badge badge-success">Confirmed</span>
            <span className="badge badge-warning">Pending</span>
            <span className="badge badge-error">Cancelled</span>
            <span className="badge badge-info">Info</span>
            <span className="badge badge-lamsa-primary">Featured</span>
            <span className="badge badge-lamsa-secondary">Popular</span>
            <span className="badge badge-gray">Default</span>
          </div>
        </section>

        {/* Alerts */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Alert Components</h2>
          <div className="space-y-4">
            <div className="alert alert-success">
              <h4 className="font-semibold">Success Alert</h4>
              <p>Your booking has been confirmed successfully.</p>
            </div>
            <div className="alert alert-warning">
              <h4 className="font-semibold">Warning Alert</h4>
              <p>Please complete your profile to continue.</p>
            </div>
            <div className="alert alert-error">
              <h4 className="font-semibold">Error Alert</h4>
              <p>Failed to process payment. Please try again.</p>
            </div>
            <div className="alert alert-info">
              <h4 className="font-semibold">Info Alert</h4>
              <p>New features are available in this update.</p>
            </div>
            <div className="alert alert-lamsa">
              <h4 className="font-semibold">Lamsa Alert</h4>
              <p>Welcome to Lamsa beauty booking platform.</p>
            </div>
          </div>
        </section>

        {/* Text Hierarchy */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Text Hierarchy</h2>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-lamsa-primary">Heading 1 - Lamsa Primary</h1>
            <h2 className="text-3xl font-semibold text-text-primary">Heading 2 - Text Primary</h2>
            <h3 className="text-2xl font-medium text-text-primary">Heading 3 - Text Primary</h3>
            <p className="text-lg text-text-secondary">Large paragraph text - Text Secondary</p>
            <p className="text-base text-text-secondary">Regular paragraph text - Text Secondary</p>
            <p className="text-sm text-text-tertiary">Small text and captions - Text Tertiary</p>
            <p className="text-xs text-text-tertiary">Extra small text - Text Tertiary</p>
          </div>
        </section>

        {/* Shadows */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-text-primary">Shadow Variants</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-lamsa-sm">
              <p className="text-center text-sm font-medium">Small</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lamsa">
              <p className="text-center text-sm font-medium">Default</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lamsa-md">
              <p className="text-center text-sm font-medium">Medium</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lamsa-lg">
              <p className="text-center text-sm font-medium">Large</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lamsa-xl">
              <p className="text-center text-sm font-medium">Extra Large</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}