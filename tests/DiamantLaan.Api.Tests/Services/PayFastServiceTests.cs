using DiamantLaan.Api.Models;
using DiamantLaan.Api.Services;
using Xunit;

namespace DiamantLaan.Api.Tests.Services;

public class PayFastServiceTests
{
    [Fact]
    public void CreateSignature_ReturnsExpectedHash()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["cancel_url"] = "https://www.example.com/cancel",
            ["notify_url"] = "https://www.example.com/itn",
            ["name_first"] = "Test User",
            ["name_last"] = "Doe",
            ["email_address"] = "test+user@example.com",
            ["m_payment_id"] = "42",
            ["amount"] = "200.00",
            ["item_name"] = "Order#42"
        };

        var signature = PayFastService.CreateSignature(data, "jt7NOE43FZPn");

        Assert.Equal("a18a81fce9f020f3cc7b901f9b84a5d5", signature);
    }

    [Fact]
    public void CreateSignature_NullData_ThrowsArgumentNullException()
    {
        var ex = Assert.Throws<ArgumentNullException>(
            () => PayFastService.CreateSignature(null!, "jt7NOE43FZPn"));

        Assert.Equal("data", ex.ParamName);
    }

    [Fact]
    public void CreateSignature_EmptyPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, "");

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
        // With empty passphrase no "&passphrase=" is appended to the param string
    }

    [Fact]
    public void CreateSignature_NullPassphrase_ProducesSignature()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var signature = PayFastService.CreateSignature(data, null!);

        Assert.NotNull(signature);
        Assert.NotEmpty(signature);
    }

    [Fact]
    public void UrlEncode_SpecialCharacters_EncodedLikePhpUrlencode()
    {
        // PHP urlencode encodes space as +, and percent-encodes ~, *, #, @, and +
        Assert.Equal("hello%2Bworld", PayFastService.UrlEncode("hello+world"));
        Assert.Equal("hello+world", PayFastService.UrlEncode("hello world"));
        Assert.Equal("%7Ehello%7E", PayFastService.UrlEncode("~hello~"));
        Assert.Equal("%2Ahello%2A", PayFastService.UrlEncode("*hello*"));
        Assert.Equal("%23hello%23", PayFastService.UrlEncode("#hello#"));
        Assert.Equal("%40hello%40", PayFastService.UrlEncode("@hello@"));
    }

    [Fact]
    public void CreateSignature_PassphraseWithSpecialCharacters_IsUrlEncoded()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["cancel_url"] = "https://www.example.com/cancel",
            ["notify_url"] = "https://www.example.com/itn",
            ["name_first"] = "Test User",
            ["name_last"] = "Doe",
            ["email_address"] = "test+user@example.com",
            ["m_payment_id"] = "42",
            ["amount"] = "200.00",
            ["item_name"] = "Order#42"
        };

        var signature = PayFastService.CreateSignature(data, "my passphrase");

        Assert.Equal("9cec51b520d25a4140fdf4934426afab", signature);
    }

    [Fact]
    public void CreateSignature_IgnoresFieldsNotInCanonicalOrder()
    {
        // Fields not in the PayFast canonical order list should be ignored
        var dataWithExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test",
            ["unknown_field"] = "should-be-ignored",
            ["another_extra"] = "also-ignored"
        };

        var dataWithoutExtra = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var sigWithExtra = PayFastService.CreateSignature(dataWithExtra, "secret");
        var sigWithoutExtra = PayFastService.CreateSignature(dataWithoutExtra, "secret");

        Assert.Equal(sigWithoutExtra, sigWithExtra);
    }

    [Fact]
    public void InstanceCreateSignature_DelegatesToStaticMethod()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        var passphrase = "test-passphrase";
        var service = new PayFastService(passphrase);
        var instanceSig = service.CreateSignature(data);
        var staticSig = PayFastService.CreateSignature(data, passphrase);

        Assert.Equal(staticSig, instanceSig);
    }

    [Fact]
    public void CreateSignature_PassphraseWithWhitespace_IsTrimmedBeforeEncoding()
    {
        var data = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "200.00",
            ["item_name"] = "Test"
        };

        // Passphrase with leading and trailing whitespace should be trimmed
        var sigTrimmed = PayFastService.CreateSignature(data, "  secret  ");
        var sigClean = PayFastService.CreateSignature(data, "secret");

        Assert.Equal(sigClean, sigTrimmed);
    }

    [Fact]
    public void UrlEncode_NonAsciiCharacters_EncodedAsUtf8ByteSequence()
    {
        // é (U+00E9) → UTF-8: 0xC3 0xA9 → %C3%A9
        Assert.Equal("%C3%A9", PayFastService.UrlEncode("é"));
        // ñ (U+00F1) → UTF-8: 0xC3 0xB1 → %C3%B1
        Assert.Equal("%C3%B1", PayFastService.UrlEncode("ñ"));
    }

    [Fact]
    public void CreateSignature_FieldValueIsZero_IsIncluded()
    {
        var dataWithZero = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["amount"] = "0",
            ["item_name"] = "Test"
        };

        var dataWithoutAmount = new Dictionary<string, string>
        {
            ["merchant_id"] = "10000100",
            ["merchant_key"] = "46f0cd694581a",
            ["return_url"] = "https://www.example.com/return",
            ["notify_url"] = "https://www.example.com/itn",
            ["item_name"] = "Test"
        };

        // string.IsNullOrEmpty("0") returns false, so "amount=0" should be included
        // and produce a different signature than when amount is absent
        var sigWithZero = PayFastService.CreateSignature(dataWithZero, "secret");
        var sigWithoutAmount = PayFastService.CreateSignature(dataWithoutAmount, "secret");

        Assert.NotEqual(sigWithoutAmount, sigWithZero);
    }

    [Fact]
    public void CreatePaymentRequest_IncludesSignedFields()
    {
        var settings = new PayFastSettings
        {
            MerchantId = "10000100",
            MerchantKey = "46f0cd694581a",
            Passphrase = "jt7NOE43FZPn",
            Sandbox = true
        };

        var service = new PayFastService(settings, new HttpClient());

        var purchase = new Purchase { Id = 42, Amount = 200.00m, UserId = "user-1" };
        var user = new User { FirstName = "Test User", LastName = "Doe", Email = "test+user@example.com" };

        var request = service.CreatePaymentRequest(purchase, user, "https://www.example.com/");

        Assert.Equal("https://sandbox.payfast.co.za/eng/process", request.ActionUrl);
        Assert.Equal("10000100", request.Fields["merchant_id"]);
        Assert.Equal("42", request.Fields["m_payment_id"]);
        Assert.Equal("200.00", request.Fields["amount"]);
        Assert.True(request.Fields.ContainsKey("signature"));
    }
}
