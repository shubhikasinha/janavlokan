import { Button } from '@/components/Button';

const gcpServices = [
    {
        name: 'Cloud Storage',
        description: 'Secure storage of anonymized raw datasets with encryption at rest',
    },
    {
        name: 'Dataflow',
        description: 'Distributed ETL and feature engineering pipelines for scalable processing',
    },
    {
        name: 'BigQuery',
        description: 'Analytics warehouse handling 100M+ transactions with partitioning and clustering',
    },
    {
        name: 'Vertex AI',
        description: 'Model training, versioning, batch prediction, and inference endpoints',
    },
    {
        name: 'Cloud Run',
        description: 'Serverless backend APIs for dashboard and real-time data access',
    },
    {
        name: 'Web Dashboard',
        description: 'Interactive interface for anomalies, explanations, and regional insights',
    },
];

const mlModels = [
    {
        name: 'Autoencoders',
        role: 'Primary Anomaly Detector',
        description: 'Neural networks trained in BigQuery ML that learn to compress and reconstruct normal beneficiary behavior patterns. High reconstruction error (MSE) indicates anomalous behavior.',
    },
    {
        name: 'Rule-Based Detection',
        role: 'Fallback & Explainability',
        description: 'Deterministic rule engine that generates human-readable flags (high recent activity, multiple dealers, cross-district usage) for audit explanations.',
    },
];

const privacyMeasures = [
    {
        title: 'No PII in Cloud',
        description: 'No personally identifiable information enters the cloud infrastructure',
    },
    {
        title: 'Irreversible Hashing',
        description: 'All sensitive identifiers are irreversibly hashed before processing',
    },
    {
        title: 'Location Generalization',
        description: 'Location data is generalized into regional clusters for privacy',
    },
    {
        title: 'Human-in-the-Loop',
        description: 'Outputs are strictly advisory with human decision-making',
    },
];

// Features content (combined from features page)
const features = [
    {
        title: 'Anomaly Detection Without Labeled Fraud Data',
        description: 'JanAvlokan uses unsupervised learning to identify deviations from normal behavior, eliminating the dependency on pre-labeled fraud datasets which are rare and delayed in public finance systems.',
        highlights: [
            'Autoencoder-based anomaly detection in BigQuery ML',
            'Mean Squared Error (MSE) as anomaly score',
            'Rule-based fallback for explainability',
            'No dependency on labeled training data',
        ],
    },
    {
        title: 'Privacy-Safe Collusion Detection',
        description: 'The platform detects patterns such as shared bank accounts or devices using irreversibly hashed identifiers, enabling detection of coordinated misuse while fully preserving beneficiary privacy.',
        highlights: [
            'All identifiers are irreversibly hashed',
            'No PII enters the cloud',
            'Location data generalized to regions',
            'Compliant with data protection principles',
        ],
    },
    {
        title: 'Policy-Aware Risk Calibration',
        description: 'Risk thresholds dynamically adapt based on scheme type, region, and time period. Seasonal surges and policy-driven variations are accounted for to reduce false positives.',
        highlights: [
            'Scheme-specific thresholds',
            'Regional baseline adjustments',
            'Seasonal variation handling',
            'Continuous model recalibration',
        ],
    },
    {
        title: 'Explainable Audit Narratives',
        description: 'Each flagged case is accompanied by a human-readable explanation outlining contributing behavioral signals designed for administrative review, audits, and legal defensibility.',
        highlights: [
            'Feature importance breakdowns',
            'Behavioral signal explanations',
            'Audit-ready documentation',
            'Legal defensibility focus',
        ],
    },
    {
        title: 'Geographic Risk Heatmaps',
        description: 'Aggregated risk scores are visualized at district or block levels, allowing administrators to identify regional concentrations of anomalous behavior and allocate audit resources efficiently.',
        highlights: [
            'District-level visualization',
            'Block-level drill-down',
            'Resource allocation insights',
            'Regional trend analysis',
        ],
    },
    {
        title: 'Real-Time Processing',
        description: 'Built on Google Cloud Platform for scalability and reliability, JanAvlokan can process 100M+ transactions using distributed computing and optimized data pipelines.',
        highlights: [
            '100M+ transaction capacity',
            'Distributed ETL pipelines',
            'Real-time risk scoring',
            'Batch prediction support',
        ],
    },
];

const mlFeatures = [
    'Rolling claim frequency patterns',
    'Deviation from personal baselines',
    'Deviation from scheme-level baselines',
    'Cross-scheme overlap detection',
    'Hashed shared identifier analysis',
    'Temporal spike indicators',
    'Geographic clustering signals',
    'Behavioral sequence modeling',
];

export default function TechnologyPage() {
    return (
        <div className="min-h-screen">
            {/* Hero Section - White */}
            <section className="bg-white py-12 md:py-16 border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-4">
                        Technology and Features
                    </h1>
                    <p className="text-lg text-gray-700 max-w-3xl">
                        Built entirely on Google Cloud Platform with unsupervised machine learning,
                        privacy-preserving technology, and explainable AI for transparent governance.
                    </p>
                </div>
            </section>

            {/* Key Capabilities Section */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Key Capabilities
                        </h2>
                        <p className="text-gray-600">Powerful features for intelligent welfare monitoring</p>
                    </div>

                    <div className="space-y-6">
                        {features.map((feature, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-4">
                                    <span className="w-8 h-8 bg-primary text-white rounded flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-lg font-heading font-semibold text-gray-900">{feature.title}</h3>
                                </div>
                                <div className="p-6">
                                    <p className="text-gray-700 mb-4">{feature.description}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {feature.highlights.map((item, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                                                <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0"></span>
                                                <span>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Architecture Overview */}
            <section className="py-12 md:py-16 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Cloud-Native Architecture
                        </h2>
                        <p className="text-gray-600">Scalable, secure, and designed for enterprise-grade deployments</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200 bg-white">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="border border-gray-200 px-4 py-3 text-left font-heading font-semibold text-gray-900">S.No.</th>
                                    <th className="border border-gray-200 px-4 py-3 text-left font-heading font-semibold text-gray-900">Service</th>
                                    <th className="border border-gray-200 px-4 py-3 text-left font-heading font-semibold text-gray-900">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gcpServices.map((service, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 px-4 py-3 text-center font-medium">{index + 1}</td>
                                        <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{service.name}</td>
                                        <td className="border border-gray-200 px-4 py-3 text-gray-600">{service.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ML Approach */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Machine Learning Approach
                        </h2>
                        <p className="text-gray-600">Autoencoder-based unsupervised anomaly detection with BigQuery ML</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {mlModels.map((model, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-primary px-4 py-3">
                                    <span className="text-white text-sm font-medium">{model.role}</span>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-heading font-semibold text-gray-900 mb-2">{model.name}</h3>
                                    <p className="text-sm text-gray-600">{model.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                                Ensemble Output
                            </h3>
                            <p className="text-gray-600 mb-4">
                                The hybrid ensemble combines outputs from all three models to produce:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                                    <span className="font-semibold text-gray-900">Risk Score</span>
                                    <p className="text-sm text-gray-600">(0-1 normalized)</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                                    <span className="font-semibold text-gray-900">Risk Category</span>
                                    <p className="text-sm text-gray-600">(Low/Medium/High)</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
                                    <span className="font-semibold text-gray-900">Feature Signals</span>
                                    <p className="text-sm text-gray-600">(Explainable)</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                                Feature Signals Analyzed
                            </h3>
                            <ul className="space-y-2">
                                {mlFeatures.map((feature, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm text-gray-700">
                                        <span className="w-5 h-5 bg-gray-100 border border-gray-300 rounded text-xs flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Alert System & Risk Categorization */}
            <section className="py-12 md:py-16 bg-gray-50 border-y border-gray-200">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="border-l-4 border-primary pl-6 mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Alert System & Risk Categorization
                        </h2>
                        <p className="text-gray-600">Real-time fraud pattern detection and intelligent alert prioritization</p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                                Five Key Fraud Risk Categories
                            </h3>
                            <p className="text-gray-600 mb-4">
                                JanAvlokan identifies and categorizes anomalous behavior into five distinct risk patterns,
                                each representing a different mode of potential fraud or system misuse:
                            </p>
                            <div className="space-y-3">
                                {[
                                    { name: 'Unusual Activity', pct: '32%', desc: 'Abnormal transaction patterns, spikes, or irregular claim timing' },
                                    { name: 'Suspicious Locations', pct: '24%', desc: 'Geographic inconsistencies or claims from unexpected regions' },
                                    { name: 'Scheme Overlaps', pct: '18%', desc: 'Multiple scheme enrollments with conflicting eligibility criteria' },
                                    { name: 'Beneficiary Clusters', pct: '15%', desc: 'Groups sharing bank accounts, devices, or other identifiers' },
                                    { name: 'Repeat Withdrawals', pct: '11%', desc: 'Excessive claim frequency beyond normal beneficiary behavior' },
                                ].map((cat, idx) => (
                                    <div key={idx} className="flex items-start gap-3 border-l-2 border-primary pl-3">
                                        <div className="flex-shrink-0 w-12 text-center">
                                            <span className="text-lg font-bold text-primary">{cat.pct}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-900">{cat.name}</h4>
                                            <p className="text-sm text-gray-600">{cat.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="font-heading font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                                High-Priority Alert System
                            </h3>
                            <p className="text-gray-600 mb-4">
                                The platform continuously monitors transactions and generates real-time alerts when
                                high-risk patterns are detected. Each alert includes:
                            </p>
                            <div className="space-y-3">
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <h4 className="font-medium text-gray-900 mb-1">Beneficiary Identifier</h4>
                                    <p className="text-sm text-gray-600">Anonymized hash for tracking while preserving privacy</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <h4 className="font-medium text-gray-900 mb-1">Risk Score & Category</h4>
                                    <p className="text-sm text-gray-600">Numerical score (0-1) and HIGH/MEDIUM/LOW classification</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <h4 className="font-medium text-gray-900 mb-1">Alert Type Description</h4>
                                    <p className="text-sm text-gray-600">Human-readable explanation (e.g., "Multiple dealers detected")</p>
                                </div>
                                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                                    <h4 className="font-medium text-gray-900 mb-1">Timestamp</h4>
                                    <p className="text-sm text-gray-600">Exact detection time for audit trail purposes</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="font-heading font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-3">
                            Trend Analysis & Weekly Monitoring
                        </h3>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-heading font-bold text-primary mb-2">7%</div>
                                <div className="text-sm text-gray-600">Average Weekly Increase in Fraud Detection</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-heading font-bold text-primary mb-2">&lt;1 min</div>
                                <div className="text-sm text-gray-600">Alert Generation Time from Transaction</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-heading font-bold text-primary mb-2">24/7</div>
                                <div className="text-sm text-gray-600">Continuous Real-Time Monitoring</div>
                            </div>
                        </div>
                        <p className="text-gray-600 mt-6 text-center">
                            Temporal trend analysis tracks weekly changes in fraud patterns, enabling proactive
                            policy adjustments and resource allocation.
                        </p>
                    </div>
                </div>
            </section>

            {/* Data Privacy */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        <div>
                            <div className="border-l-4 border-primary pl-6 mb-6">
                                <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                                    Privacy-First Design
                                </h2>
                            </div>
                            <p className="text-gray-700 mb-4">
                                Privacy is central to JanAvlokan&apos;s architecture. The system ensures
                                compliance with data protection principles while maintaining analytical
                                effectiveness.
                            </p>
                            <p className="text-gray-700">
                                This approach enables powerful anomaly detection while fully preserving
                                beneficiary privacy and maintaining the trust essential for government systems.
                            </p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-primary px-4 py-3">
                                <span className="text-white font-medium">Privacy Measures</span>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {privacyMeasures.map((measure, index) => (
                                    <div key={index} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="w-6 h-6 bg-white border border-gray-300 rounded text-xs flex items-center justify-center font-medium flex-shrink-0">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{measure.title}</h4>
                                                <p className="text-sm text-gray-600">{measure.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Scalability */}
            <section className="py-12 md:py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-2">
                            Scalability and Performance
                        </h2>
                        <p className="text-gray-600">Designed for national-scale deployment</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { value: '100M+', label: 'Transactions Processed' },
                            { value: '<1s', label: 'Risk Score Generation' },
                            { value: '99.9%', label: 'Uptime SLA' },
                            { value: 'Auto', label: 'Scaling Enabled' },
                        ].map((stat, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                                <div className="text-2xl md:text-3xl font-heading font-bold text-primary mb-1">{stat.value}</div>
                                <div className="text-sm text-gray-600">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section - White */}
            <section className="py-12 md:py-16 bg-gray-50 border-t border-gray-200">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-gray-900 mb-4">
                        Access System Dashboard
                    </h2>
                    <p className="text-gray-600 mb-8">
                        Monitor risk assessments and generate audit reports
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Button href="/dashboard">
                            Open Dashboard
                        </Button>
                        <Button variant="secondary" href="/about">
                            Contact Support
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
