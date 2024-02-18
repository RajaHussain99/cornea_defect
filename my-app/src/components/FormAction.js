import React from 'react';

export default function FormAction({
    handleSubmit,
    type = 'Button',
    action = 'submit',
    text
}) {
    const handleSignIn = async () => {
        // Perform sign-in logic using handleSubmit if needed

        // Assume a successful sign-in
        // Redirect to the "/home" page using your navigation mechanism
        redirectToHome();
    };

    const redirectToHome = () => {
        // Implement your own logic to redirect to the home page
        // For example, you might use window.location.href or a different navigation function
        window.location.href = '/upload';
    };

    return (
        <>
            {type === 'Button' ? (
                <button
                    type={action}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mt-10"
                    onClick={handleSignIn}
                >
                    {text}
                </button>
            ) : (
                <></>
            )}
        </>
    );
}